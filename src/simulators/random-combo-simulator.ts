import type { SimulationOptions } from "../runner.js";
import { Simulator, type SimulatorCommonOptions, type SimulatorResult } from "./simulator.js";
import type { AutoBattle } from "../types/trimps/autoBattle.js";
import type { TrimpsWindow } from "../types/trimps/trimps.js";
import { createProgressBar, incrementProgressBar, removeProgressBar } from "../progress-bar-manager.js";

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

    public getName(): string {
        return "Random Combo Simulator"
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
        const trimps: TrimpsWindow = window as any;
        // Initial load to get stats
        trimps.load(options.trimpsSaveString, false, false);
        const autoBattle: AutoBattle = trimps.autoBattle;

        const availableItems: string[] = Object.entries(autoBattle.items).filter(([_, item]) => item.owned).map(([name, _]) => name);
        const hands = autoBattle.getMaxItems();

        let bestResult: SimulatorResult;
        let bestSaved = options.save?.[options.level];
        const totalSimulations =
            // Initial random simulation if no existing build exists
            (bestSaved ? 0 : 1)
            // Re-testing existing builds
            + Object.values(options.save ?? {}).reduce((acc, save) => {
                if (save.farmItems) {
                    acc += 1;
                }
                if (save.pushItems) {
                    acc += 1;
                }
                return acc;
            }, 0)
            // random simulations
            + options.customData.numberOfRandomSimulations
            // swap algorithm
            + hands * (availableItems.length - hands) * 2;
        createProgressBar(options.progressBarId, {
            total: totalSimulations,
            level: options.level,
            masterProgressBarId: options.masterProgressBarId
        });

        // We already have a saved build
        if (bestSaved) {
            console.log(`Found existing save with ${bestSaved.farmDustPerSec} dust/s and ${bestSaved.pushEnemiesPerMin} enemies/min, setting as starting point.`);
            bestResult = {
                bestFarmItems: bestSaved.farmItems ?? [],
                bestPushItems: bestSaved.pushItems ?? [],
                ...runSimulation(autoBattle, options.customData.framesPerSimulation, bestSaved.farmItems ?? []),
                level: options.level
            };
        } else {
            // Random start
            shuffle(availableItems);
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
            shuffle(availableItems);
            const randomItems = availableItems.slice(0, hands);
            const simResult = runSimulation(autoBattle, options.customData.framesPerSimulation, randomItems);
            bestResult = getNewBest(bestResult, { ...simResult, items: randomItems });
        }

        // See if we can refine the best dust by changing items out
        // Remove each item, and try each other unused item in its place
        console.log(`Starting swap algorithm...`);
        const farmUnusedItems = availableItems.filter((name) => !bestResult.bestFarmItems.includes(name));
        const pushUnusedItems = availableItems.filter((name) => !bestResult.bestPushItems.includes(name))
        for (let itemIndexToSubstitute = 0; itemIndexToSubstitute < hands; itemIndexToSubstitute++) {
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

        removeProgressBar(options.progressBarId);
        return bestResult;

        // return names are like that for easy deconstruction to zone save
        function runSimulation(autoBattle: AutoBattle, framesPerSimulation: number, items: string[]): { bestDustPerSec: number, bestEnemiesPerMin: number } {
            autoBattle.enemyLevel = options.level;

            autoBattle.dust = 0;
            autoBattle.sessionEnemiesKilled = 0;
            for (const name in autoBattle.items) {
                const item =  autoBattle.items[name];
                if (item) {
                    item.equipped = items.includes(name);
                }
            }
            //autoBattle.items = Object.fromEntries(Object.entries(autoBattle.items).map(([name, item]) => { item.equipped = items.includes(name); return [name, item] }));
            autoBattle.resetCombat(true);
            // each frame is 300ms
            for (let i = 0; i < framesPerSimulation; i++) {
                autoBattle.fight();
                // Needed for dust per sec calculation later to work
                autoBattle.battleTime += autoBattle.frameTime;
            }
            const minutesSimulated = (framesPerSimulation * autoBattle.frameTime) / 60000;
            incrementProgressBar(options.progressBarId);
            return {
                bestDustPerSec: autoBattle.getDustPs(),
                bestEnemiesPerMin: autoBattle.sessionEnemiesKilled / minutesSimulated
            };
        }

        function getNewBest(currentBest: SimulatorResult, newContender: { items: string[], bestDustPerSec: number, bestEnemiesPerMin: number }): SimulatorResult {
            let res: SimulatorResult = { ...currentBest };
            if (newContender.bestDustPerSec > res.bestDustPerSec) {
                console.log(`New best farm build found with ${newContender.bestDustPerSec} dust/s`);
                res.bestDustPerSec = newContender.bestDustPerSec;
                res.bestFarmItems = newContender.items;
            }

            if (newContender.bestEnemiesPerMin > res.bestEnemiesPerMin) {
                console.log(`New best push build found with ${newContender.bestEnemiesPerMin} enemies/min`);
                res.bestEnemiesPerMin = newContender.bestEnemiesPerMin;
                res.bestPushItems = newContender.items;
            }
            return res;
        }
        function shuffle<T>(arr: (T | undefined)[]): void  {
            for (let i = arr.length - 1; i > 0; i--) {
                
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
    }
}

