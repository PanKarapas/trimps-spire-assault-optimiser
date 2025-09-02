import type { SettingsFile } from "../index.js";
import { RandomComboSimulator } from "./random-combo-simulator.js";

export function createSimulator(settings: SettingsFile): RandomComboSimulator {
    switch(settings.simulator.name) {
        case "Random Combo Simulator" : 
            return new RandomComboSimulator(RandomComboSimulator.parseOptions(settings.simulator.simulatorSettings))
        default:
             throw new Error(`Unknown Simulator ${settings.simulator.name}`);
    }
    
}