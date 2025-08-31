import fs from 'fs'

import { SimulatorRunner, type RunnerOptions } from './runner.js';
import { createSimulator } from './simulators/simulator-factory.js';
import { resolvePath } from './utils.js';
import { ProgressBarManager } from './progress-bar-manager.js';

export interface RunnerSettings extends Omit<RunnerOptions, 'trimpsSaveString'> {
  trimpsSaveFilepath: string,
  headless: boolean,
  devtools: boolean,
}

export interface SettingsFile {
  runner: RunnerSettings,
  simulator: {
    name: string,
    simulatorSettings: Record<string, unknown>; // validated later
  }
}

// ---- Load config ----
if (process.argv.length < 3) {
  console.error("Usage: node main.js <config-file>");
  process.exit(1);
}

const configPath = resolvePath(process.argv[2] ?? "");
let config: SettingsFile;
try {
  const raw = fs.readFileSync(configPath, "utf-8");
  config = JSON.parse(raw) as SettingsFile; // TODO: schema validation
} catch (err) {
  console.error(`Failed to load config at ${configPath}:`, err);
  process.exit(1);
}

// ---- Load game save ----
const gameSaveString = fs.readFileSync(
  resolvePath(config.runner.trimpsSaveFilepath),
  { encoding: "utf-8" }
);

// ---- Runner ----
const { headless, devtools, ...runnerOptions } = config.runner;
const runner = new SimulatorRunner({
  ...runnerOptions,
  saveFilePath: resolvePath(config.runner.saveFilePath),
  saveBackupBeforeSimulation: {
    ...config.runner.saveBackupBeforeSimulation,
    filepath: resolvePath(config.runner.saveBackupBeforeSimulation.filepath)
  },
  trimpsSaveString: gameSaveString,
  trimpsIndexFilepath: resolvePath(config.runner.trimpsIndexFilepath)
});

// ---- Simulator ----
const simulator = createSimulator(config);

// ---- Run ----
runner.launch({
  headless: config.runner.headless,
  devtools: config.runner.devtools
})
  .then(async () => {
    await runner.run(simulator);
  })
  .catch((err) => {
    console.error('Simulation failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    runner.close();
    ProgressBarManager.getInstance().stop();
  });


