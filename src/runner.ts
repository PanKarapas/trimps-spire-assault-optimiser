import puppeteer from "puppeteer";
import { getTrimpsStats, resolvePath, type TrimpsStats } from "./utils.js";
import type { Simulator, SimulatorResult as SimulationResult, SimulatorCommonOptions } from "./simulators/simulator.js";
import { LimitedParallelRunner } from "./limited-parallel-runner.js";
import { readSave, writeSave, type Save } from "./saveFile.js";
import { createWriteStream, type PathLike, type WriteStream } from "fs";
import { createMasterProgressBar, createProgressBar, incrementProgressBar, logProgressBar, ProgressBarManager, removeProgressBar } from "./progress-bar-manager.js";

export interface RunnerOptions {
    trimpsIndexFilepath: string,
    maxParallelPages: number,
    trimpsSaveString: string,
    saveBackupBeforeSimulation: {
        enabled: boolean,
        filepath: string
    },
    levelStart: number,
    levelEnd: number,
    saveFilePath: string,
    browserLogs: {
        includeInProgressBars: boolean,
        fileToWriteTo?: string
    }
}

export interface SimulationOptions<T> {
    trimpsSaveString: string,
    trimpsStats: TrimpsStats,
    level: number,
    save: Save,
    progressBarId: number,
    masterProgressBarId: number,
    customData: T
}

// Runs in the browser
export type SimulationFunction<CustomData> = (options: SimulationOptions<CustomData>) => SimulationResult;

export class SimulatorRunner {

    private browser?: puppeteer.Browser | undefined;
    private browserLogsWriteStream?: WriteStream | undefined;
    public constructor(private options: RunnerOptions) {
        if( this.options.browserLogs.fileToWriteTo) {
            this.browserLogsWriteStream = createWriteStream(resolvePath(this.options.browserLogs.fileToWriteTo), { flags: 'a'})
            this.browserLogsWriteStream.write(`=== New run started [${new Date(Date.now()).toISOString()}] ===\n`)
        }
     }

    public async launch(options?: puppeteer.LaunchOptions | undefined) {
        if (!this.browser) {
            this.browser = await puppeteer.launch(options);
        } else {
            throw new Error("A browser window already exists.")
        }
    }

    public async close() {
        await this.browser?.close();
        this.browserLogsWriteStream?.close();
    }

    public async run<T, S extends SimulatorCommonOptions>(simulator: Simulator<T, S>) {
        if (!this.browser) {
            throw new Error("Use Runner.launch() first, to create a new browser window.");
        }

        const save = readSave(this.options.saveFilePath);
        if (this.options.saveBackupBeforeSimulation.enabled) {
            writeSave(this.options.saveBackupBeforeSimulation.filepath, save);
        }

        const trimpsStats = await this.getStats();
        this.options.levelEnd ??= this.options.levelStart;

        // If negative level end, count from the end of the range of available levels
        // This way -1 will always be the last unlocked zone
        if (this.options.levelEnd < 0) {
            this.options.levelEnd = trimpsStats.maxEnemyLevel + this.options.levelEnd + 1;
        }
        this.checkLevels(this.options.levelStart, this.options.levelEnd, trimpsStats);

        if (this.options.maxParallelPages < 1) {
            throw new Error("maxParallelPages must be >= 1");
        }

        const parallelRunner = new LimitedParallelRunner<SimulationResult>(this.options.maxParallelPages);
        const baseCustomData = await simulator.getCustomData();
        createMasterProgressBar(0, {
            numberOfChildBars: 1 + this.options.levelEnd - this.options.levelStart,
            name: simulator.getName()
        })

        
        for (let currLevel = this.options.levelStart; currLevel <= this.options.levelEnd; currLevel++) {
            const data: SimulationOptions<T> = {
                trimpsStats,
                trimpsSaveString: this.options.trimpsSaveString,
                level: currLevel,
                save,
                progressBarId: currLevel,
                masterProgressBarId: 0,
                customData: baseCustomData
            };
            parallelRunner.push(async () => {
                const retVal = await this.runSingle<T>(simulator.simulation, data)
                return retVal;
            });
        }
        let res = await parallelRunner.processQueue();
        await simulator.postProcessData(this.options.saveFilePath, trimpsStats, res);
    }

    private async runSingle<T>(fnc: SimulationFunction<T>, data: SimulationOptions<T>): Promise<SimulationResult> {
        if (!this.browser) {
            throw new Error("Use Runner.launch() first, to create a new browser window.");
        }
        const page = await this.browser.newPage();

        await page.exposeFunction("createProgressBar", createProgressBar);
        await page.exposeFunction("removeProgressBar", removeProgressBar);
        await page.exposeFunction("incrementProgressBar", incrementProgressBar);

        if (this.browserLogsWriteStream || this.options.browserLogs.includeInProgressBars) {
            page.on('console', message => {
                if(this.options.browserLogs.includeInProgressBars) {
                   logProgressBar(data.progressBarId, message.text())
                }
                this.browserLogsWriteStream?.write(`[Level ${data.level}] ${message.text()}\n`);
            })
        }
        try {
            await page.goto(this.options.trimpsIndexFilepath, { waitUntil: 'networkidle0', timeout: 0 });
            return await page.evaluate(fnc, data);
        } finally {
            page.close();
        }
    }



    private checkLevels(levelStart: number, levelEnd: number, trimpsStats: TrimpsStats) {
        if (levelStart > trimpsStats.maxEnemyLevel) {
            throw new Error("Level start can't be higher than the max enemy level.");
        } else if (levelStart < 1) {
            throw new Error("Level start can't be less than 1.");
        }

        if (levelEnd > trimpsStats.maxEnemyLevel) {
            throw new Error("Level end can't be higher than the max enemy level.");
        } else if (levelEnd < levelStart) {
            throw new Error("Level end can't be less than level start.");
        }
    }

    private async getStats(): Promise<TrimpsStats> {
        if (!this.browser) {
            throw new Error("Use Runner.launch() first, to create a new browser window.");
        }
        const page = await this.browser.newPage();
        try {
            await page.goto(this.options.trimpsIndexFilepath, { waitUntil: 'networkidle0', timeout: 0 });
            return await page.evaluate(getTrimpsStats, this.options.trimpsSaveString);
        } finally {
            page.close();
        }
    }
}
