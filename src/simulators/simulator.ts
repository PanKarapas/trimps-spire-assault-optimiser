import type { SimulationOptions } from "../runner.js";
import type { TrimpsStats } from "../utils.js";

import type { TypeOf, z, ZodTypeAny } from "zod/v3";

export interface SimulatorCommonOptions { }

export abstract class Simulator<CustomData, CustomOptions extends SimulatorCommonOptions, SimulationResult, SaveType extends ZodTypeAny> {
    protected options: CustomOptions;
    protected constructor(options: CustomOptions) {
        this.options = options;
    }
    // Runs in the browser
    public abstract simulation(options: SimulationOptions<CustomData, TypeOf<SaveType>>): SimulationResult;
    // Run in node
    public abstract getCustomData(): Promise<CustomData>;

    public abstract getName(): string;

    public abstract getSchema(): SaveType;
    public abstract getSaveData(oldSave: z.TypeOf<SaveType>, trimpsStats: TrimpsStats, data: SimulationResult[]): z.TypeOf<SaveType> | undefined;
    public abstract getPrintText(trimpsStats: TrimpsStats, data: SimulationResult[]): string | undefined;
}
