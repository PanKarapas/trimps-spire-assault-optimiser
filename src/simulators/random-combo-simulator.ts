import type { SimulationOptions } from "../runner.js";
import { Simulator, type SimulatorCommonOptions, type SimulatorResult } from "./simulator.js";
import { readSave, writeSave, type Save, type ZoneSave } from "../saveFile.js";
import type { AutoBattle } from "../types/trimps/autoBattle.js";
import type { TrimpsWindow } from "../types/trimps/trimps.js";
import fs, { type PathLike } from 'fs'


export interface RandomComboSimulatorCustomData {
    framesPerSimulation: number,
    numberOfRandomSimulations: number,
}

export interface RandomComboSimulatorOptions extends SimulatorCommonOptions {
    framesPerSimulation: number,
    numberOfRandomSimulations: number,
}
export class RandomComboSimulator extends Simulator<RandomComboSimulatorCustomData, RandomComboSimulatorOptions> {
    public constructor(unvalidatedOptions: Record<string, any>) {
            super(unvalidatedOptions);
    }
    protected validateOptions(options: Record<string, any>): options is RandomComboSimulatorOptions {
        if (typeof options !== "object" || options === null) {
            console.error("Options must be an object");
        }

        if (typeof options.framesPerSimulation !== "number" || options.framesPerSimulation <= 0) {
            console.error("framesPerSimulation must be a positive number");
        }

        if (typeof options.numberOfRandomSimulations !== "number" || options.numberOfRandomSimulations <= 0) {
            console.error("numberOfRandomSimulations must be a positive number");
        }

        return true;
    }

    public async getCustomData(): Promise<RandomComboSimulatorCustomData> {
        return {
            framesPerSimulation: this.options.framesPerSimulation,
            numberOfRandomSimulations: this.options.numberOfRandomSimulations,
        };
    }

    public simulation(options: SimulationOptions<RandomComboSimulatorCustomData>): SimulatorResult {
        // return names are like that for easy deconstruction to zone save
        function runSimulation(autoBattle: AutoBattle, framesPerSimulation: number, items: string[]): { bestDustPerSec: number, bestEnemiesPerMin: number } {
            trimps.load(options.trimpsSaveString, false, false);
            autoBattle.enemyLevel = options.level;

            autoBattle.dust = 0;
            autoBattle.sessionEnemiesKilled = 0;
            autoBattle.items = Object.fromEntries(Object.entries(autoBattle.items).map(([name, item]) => { item.equipped = items.includes(name); return [name, item] }));
            autoBattle.resetCombat(true);
            // each frame is 300ms
            for (let i = 0; i < framesPerSimulation; i++) {
                autoBattle.fight();
                // Needed for dust per sec calculation later to work
                autoBattle.battleTime += autoBattle.frameTime;
            }
            const minutesSimulated =  (framesPerSimulation * autoBattle.frameTime) / 60000;

            return {
                bestDustPerSec: autoBattle.getDustPs(),
                bestEnemiesPerMin: autoBattle.sessionEnemiesKilled / minutesSimulated
            };
        }

        function getNewBest(currentBest: SimulatorResult, newContender: { items: string[], bestDustPerSec: number, bestEnemiesPerMin: number }): SimulatorResult {
            let res: SimulatorResult = { ...currentBest };
            if (newContender.bestDustPerSec > res.bestDustPerSec) {
                res.bestDustPerSec = newContender.bestDustPerSec;
                res.bestFarmItems = newContender.items;
            }

            if (newContender.bestEnemiesPerMin > res.bestEnemiesPerMin) {
                res.bestEnemiesPerMin = newContender.bestEnemiesPerMin;
                res.bestPushItems = newContender.items;
            }
            return res;
        }
        const trimps: TrimpsWindow = window as any;
        // Initial load to get stats
        trimps.load(options.trimpsSaveString, false, false);
        const autoBattle: AutoBattle = trimps.autoBattle;

        const availableItems: string[] = Object.entries(autoBattle.items).filter(([_, item]) => item.owned).map(([name, _]) => name);
        const hands = autoBattle.getMaxItems();

        let bestResult: SimulatorResult;
        let bestSaved = options.save?.[options.level];
        // We already have a saved build
        if (bestSaved) {
            console.log(`Found existing save with ${bestSaved.farmDustPerSec} dust/s, setting as starting point.`);
            bestResult = {
                bestDustPerSec: bestSaved.farmDustPerSec ?? 0,
                bestFarmItems: bestSaved.farmItems ?? [],
                bestEnemiesPerMin: bestSaved.pushEnemiesPerMin ?? 0,
                bestPushItems: bestSaved.pushItems ?? [],
                level: options.level
            };

        } else {
            // Random start
            availableItems.sort(() => Math.random() - Math.random());
            const items = availableItems.slice(0, hands);
            bestResult = {
                bestFarmItems: items,
                bestPushItems: items,
                ...runSimulation(autoBattle, options.customData.framesPerSimulation, items),
                level: options.level
            };
        }
        console.log("Checking existing builds...");
        for (let existingBuild of Object.values(options.save ?? {})) {
            if (existingBuild?.farmItems) {
                const simResult = runSimulation(autoBattle, options.customData.framesPerSimulation, existingBuild.farmItems);
                bestResult = getNewBest(bestResult, { ...simResult, items: existingBuild.farmItems });
            }
            if (existingBuild?.pushItems) {
                const simResult = runSimulation(autoBattle, options.customData.framesPerSimulation, existingBuild.pushItems);
                bestResult = getNewBest(bestResult, { ...simResult, items: existingBuild.pushItems });
            }
        }
        console.log(`Starting random simulations...`);
        // Run a bunch of random combos to look for an improvement
        for (let sim = 0; sim < options.customData.numberOfRandomSimulations; sim++) {
            availableItems.sort(() => Math.random() - Math.random());
            const randomItems = availableItems.slice(0, hands);
            const simResult = runSimulation(autoBattle, options.customData.framesPerSimulation, randomItems);
            bestResult = getNewBest(bestResult, { ...simResult, items: randomItems });
        }

        // See if we can refine the best dust by changing items out
        // Remove each item, and try each other unused item in its place
        if (bestResult.bestPushItems.length == bestResult.bestFarmItems.length) {
            console.log(`Starting swap algorithm...`);
            const farmUnusedItems = availableItems.filter((name) => !bestResult.bestFarmItems.includes(name));
            const pushUnusedItems = availableItems.filter((name) => !bestResult.bestPushItems.includes(name))
            for (let itemIndexToSubstitute = 0; itemIndexToSubstitute < bestResult.bestFarmItems.length; itemIndexToSubstitute++) {
                const calc = (bestBuild: string[], availableItems: string[]) => {
                    for (let itemToAdd of availableItems) {

                        const bestItemsCopy = [...bestBuild];
                        bestItemsCopy.splice(itemIndexToSubstitute, 1, itemToAdd);
                        const newItems = bestItemsCopy;
                        const simResult = runSimulation(autoBattle, options.customData.framesPerSimulation, newItems);
                        bestResult = getNewBest(bestResult, { ...simResult, items: newItems });
                    }
                };
                calc(bestResult.bestFarmItems, farmUnusedItems);
                calc(bestResult.bestPushItems, pushUnusedItems);
            }
            console.log("Finished swapping algorithm.");
        } else {
            console.log("Uneven push and farm items, skipping swapping algorihm.");
        }

        return bestResult;
    }

}

