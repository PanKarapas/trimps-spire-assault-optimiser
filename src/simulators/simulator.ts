import type { PathLike } from "fs";
import type { SimulationFunction, SimulationOptions } from "../runner.js";
import { readSave, writeSave, type ZoneSave } from "../saveFile.js";
import type { TrimpsStats } from "../utils.js";

import pkg from 'humanize-duration';
const { humanizer } = pkg;

export interface SimulatorResult {
    bestDustPerSec: number,
    bestFarmItems: string[],
    bestEnemiesPerMin: number,
    bestPushItems: string[],
    level: number
}

export interface SimulatorCommonOptions {
    updateSaveFile: boolean,
}

export abstract class Simulator<CustomData, CustomOptions extends SimulatorCommonOptions> {
    protected options: CustomOptions;
    protected constructor(unvalidatedOptions: Record<string, any>) {
        if (!this.validateOptions(unvalidatedOptions)) {
            throw new Error("Simulator options failed to validate. Check the error log for more information.");
        }
        this.options = unvalidatedOptions;
    }
    // Runs in the browser
    public abstract simulation(options: SimulationOptions<CustomData>): SimulatorResult;
    // Run in node
    public abstract getCustomData(): Promise<CustomData>;

    protected abstract validateOptions(options: Record<string, any>): options is CustomOptions;

    public postProcessData(saveFilePath: PathLike, trimpsStats: TrimpsStats, data: SimulatorResult[]): Promise<void> {
        if (this.options.updateSaveFile && data.length > 0) {
            try {
                const currSave = readSave(saveFilePath);
                data.forEach((el) => {
                    currSave[el.level] = this.mapBestFarmResultToZoneSave(el)
                });
                writeSave(saveFilePath, currSave);
            } catch (err) {
                throw new Error(`Failed to update save file at ${String(saveFilePath)}: ${(err as Error).message}`);
            }
        }
        const best = Simulator.findBest(data);
        let pushResult: string;
        if (best.push.level == trimpsStats.maxEnemyLevel) {
            const timeToClear = humanizer({ round: true })((trimpsStats.enemiesOnMaxLevel / best.push.bestEnemiesPerMin) * 60_000);
            pushResult = `
            Level ${best.push.level} can be pushed.
            With a killing rate of ${best.push.bestEnemiesPerMin} enemies a minute it will take ${timeToClear} to clear.
            Using: ${best.push.bestPushItems.join(', ')}`;
        } else {
            pushResult = `
            No build found that can push ${trimpsStats.maxEnemyLevel}.
            `;
        }
        console.log(`
            === Farm ===
            Best dust/sec: ${best.farm.bestDustPerSec}
            At level: ${best.farm.level}
            Using Items: ${best.farm.bestFarmItems.join(', ')}
            === Push ===${pushResult}`);
        return Promise.resolve();
    }

    private mapBestFarmResultToZoneSave(data: SimulatorResult): ZoneSave {
        return {
            farmDustPerSec: data.bestDustPerSec,
            farmItems: data.bestFarmItems,
            pushEnemiesPerMin: data.bestEnemiesPerMin,
            pushItems: data.bestPushItems
        };
    }

    private static findBest(data: SimulatorResult[]): { farm: SimulatorResult, push: SimulatorResult } {
        let res: { farm: SimulatorResult, push: SimulatorResult } = {
            farm: {
                bestDustPerSec: 0,
                bestFarmItems: [],
                bestEnemiesPerMin: 0,
                bestPushItems: [],
                level: 0
            },
            push: {
                bestDustPerSec: 0,
                bestFarmItems: [],
                bestEnemiesPerMin: 0,
                bestPushItems: [],
                level: 0
            }
        };
        for (const row of data) {
            if (row.bestDustPerSec > res.farm.bestDustPerSec) {
                res.farm = row;
            }
            if (row.bestEnemiesPerMin > 0 && row.level > res.push.level) {
                res.push = row;
            }
        }
        return res;
    }
}
