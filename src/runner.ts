import puppeteer from "puppeteer";
import { getTrimpsStats, resolvePath, type TrimpsStats } from "./utils.js";
import type { Simulator, SimulatorCommonOptions } from "./simulators/simulator.js";
import { LimitedParallelRunner } from "./limited-parallel-runner.js";
import { createWriteStream, type WriteStream } from "fs";
import { createMasterProgressBar, createProgressBar, incrementProgressBar, logProgressBar, ProgressBarManager, removeProgressBar } from "./progress-bar-manager.js";
import { SaveManager } from "./save-manager.js";
import type { TypeOf, ZodTypeAny } from "zod/v3";

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
    browserLogs: {
        includeInProgressBars: boolean,
        fileToWriteTo?: string
    },

    updateSave: boolean,
    saveFilePath: string,
    printResults: boolean
}

export interface SimulationOptions<CustomData, SaveType> {
    trimpsSaveString: string,
    trimpsStats: TrimpsStats,
    level: number,
    saveData: SaveType,
    progressBarId: number,
    masterProgressBarId: number,
    customData: CustomData
}

// Runs in the browser
export type SimulationFunction<CustomData, SaveType, Result> = (options: SimulationOptions<CustomData, SaveType>) => Result;

export class SimulatorRunner {

    private browser?: puppeteer.Browser | undefined;
    private browserLogsWriteStream?: WriteStream | undefined;
    public constructor(private options: RunnerOptions) {
        if (this.options.browserLogs.fileToWriteTo) {
            this.browserLogsWriteStream = createWriteStream(resolvePath(this.options.browserLogs.fileToWriteTo), { flags: 'a' })
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

    public async run<
        CustomData,
        CustomOptions extends SimulatorCommonOptions,
        SimulationResult,
        SaveType extends ZodTypeAny
    >(simulator: Simulator<CustomData, CustomOptions, SimulationResult, SaveType>) {
        if (!this.browser) {
            throw new Error("Use Runner.launch() first, to create a new browser window.");
        }
        const saveManager = new SaveManager<SaveType>(this.options.saveFilePath, simulator.getSchema())
        const save = saveManager.read();
        if (this.options.saveBackupBeforeSimulation.enabled) {
            saveManager.writeTo(this.options.saveBackupBeforeSimulation.filepath, save);
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
            const data: SimulationOptions<CustomData, TypeOf<SaveType>> = {
                trimpsStats,
                trimpsSaveString: this.options.trimpsSaveString,
                level: currLevel,
                saveData: save,
                progressBarId: currLevel,
                masterProgressBarId: 0,
                customData: baseCustomData
            };
            parallelRunner.push(async () => {
                const retVal = await this.runSingle<CustomData, SaveType, SimulationResult>(simulator.simulation, data)
                return retVal;
            });
        }
        let res = await parallelRunner.processQueue();
        simulator.getPrintText(trimpsStats, res);
        if(this.options.printResults) {
            console.log(`${simulator.getPrintText(trimpsStats, res)}\n`);
        }

        if (this.options.updateSave) {
            saveManager.write(simulator.getSaveData(save, trimpsStats, res));
        }
    }

    private async runSingle<CustomData, SaveType, SimulationResult>(fnc: SimulationFunction<CustomData, SaveType, SimulationResult>, data: SimulationOptions<CustomData, SaveType>): Promise<SimulationResult> {
        if (!this.browser) {
            throw new Error("Use Runner.launch() first, to create a new browser window.");
        }
        const page = await this.browser.newPage();

        await page.exposeFunction("createProgressBar", createProgressBar);
        await page.exposeFunction("removeProgressBar", removeProgressBar);
        await page.exposeFunction("incrementProgressBar", incrementProgressBar);

        if (this.browserLogsWriteStream || this.options.browserLogs.includeInProgressBars) {
            page.on('console', message => {
                if (this.options.browserLogs.includeInProgressBars) {
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
