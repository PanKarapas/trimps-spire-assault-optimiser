import puppeteer from "puppeteer";
import { getTrimpsStats, type TrimpsStats } from "./utils.js";
import type { Simulator, SimulatorResult as SimulationResult, SimulatorCommonOptions } from "./simulators/simulator.js";
import { LimitedParallelRunner } from "./limited-parallel-runner.js";
import { readSave, writeSave, type Save } from "./saveFile.js";
import type { PathLike } from "fs";

export interface RunnerOptions {
    trimpsIndexFilepath: string,
    maxParallelPages: number,
    trimpsSaveString: string,
    redirectLogsToCLI?: boolean,
    saveBackupBeforeSimulation: {
        enabled: boolean,
        filepath: string
    },
    levelStart: number,
    levelEnd: number,
    saveFilePath: string,
}

export interface SimulationOptions<T> {
    trimpsSaveString: string,
    trimpsStats: TrimpsStats,
    level: number,
    save: Save,
    customData: T
}

// Runs in the browser
export type SimulationFunction<CustomData> = (options: SimulationOptions<CustomData>) => SimulationResult;

export class SimulatorRunner {

    private browser?: puppeteer.Browser | undefined;

    public constructor(private options: RunnerOptions) { }

    public async launch(options?: puppeteer.LaunchOptions | undefined) {
        if (!this.browser) {
            this.browser = await puppeteer.launch(options);
        } else {
            throw new Error("A browser window already exists.")
        }
    }

    public async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = undefined;
        } else {
            throw new Error("No browser window exists to close.")
        }
    }

    public async run<T, S extends SimulatorCommonOptions>(simulation: Simulator<T, S>) {
        if (!this.browser) {
            throw new Error("Use Runner.launch() first, to create a new browser window.");
        }
        const save = readSave(this.options.saveFilePath);
        if (this.options.saveBackupBeforeSimulation.enabled) {
            writeSave(this.options.saveBackupBeforeSimulation.filepath, save);
        }

        const trimpsStats = await this.getStats();
        this.options.levelEnd ??= this.options.levelStart;
        this.checkLevels(this.options.levelStart, this.options.levelEnd, trimpsStats);

        if (this.options.maxParallelPages < 1) {
            throw new Error("maxParallelPages must be >= 1");
        }
        
        const parallelRunner = new LimitedParallelRunner<SimulationResult>(this.options.maxParallelPages);
        const baseCustomData = await simulation.getCustomData();

        for (let currLevel = this.options.levelStart; currLevel <= this.options.levelEnd; currLevel++) {
            const data: SimulationOptions<T> = {
                trimpsStats,
                trimpsSaveString: this.options.trimpsSaveString,
                level: currLevel,
                save,
                customData: baseCustomData
            };
            parallelRunner.push(async () => await this.runSingle<T>(simulation.simulation, data));
        }
        let res = await parallelRunner.processQueue();
        await simulation.postProcessData(this.options.saveFilePath, trimpsStats, res);
    }

    private async runSingle<T>(fnc: SimulationFunction<T>, data: SimulationOptions<T>): Promise<SimulationResult> {
        if (!this.browser) {
            throw new Error("Use Runner.launch() first, to create a new browser window.");
        }
        const page = await this.browser.newPage();

        if (this.options.redirectLogsToCLI) {
            page.on('console', message => console.log(`[${data.level}] ${message.text()}`))
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
