# Trimps Spire Assault Optimiser
A tool for running simulations of trimps' assault spires. This is a personal project I am developing for my own use. I am publishing it since others might find it useful. I give no guarantees of accuracy or project stability. Expect the configuration options to change frequently, especially during the early stages of development.

## Quick Start
```bash
git clone --recurse-submodules https://github.com/PanKarapas/trimps-spire-assault-optimiser.git
cd trimps-spire-assault-optimiser
yarn install
yarn start
```

For a more detailed run guide, see the [Running](#️-running) section

## How it works

When run, this project will run multiple instances of SA in parallel in the background. This is achieved by creating a headless (no visual) chrome browser instance, then running the game on a number of tabs at once. Only the SA code runs during a simulation to reduce the overhead (the rest of the game will be frozen). There are (or at least will be) different simulators that can be run to get different types of results. See [Simulators](#simulators) for a full list.

## ⚙️Settings
When running this project, the path to a settings file needs to be passed in. These settings drive how the simulator works. The plan is for it to be a quick and easy way to fully configure simulations without ever needing to touch the code.

An example [settings.json](./resources/settings.json) file is provided.

### Settings list
- `runner`:
    - `trimpsIndexFilepath`: string - The index file of the trimps project. For inexperienced users this should be left as the default.
    - `maxParallelPages`: integer - number of maximum instances of the simulation to run at once. Smaller means the simulation will take longer to finish, but will require less system resources.
    - `redirectLogsToCLI`: true/false - If true it will re-direct any console.logs() from inside the browser side code to the command line. Used for debugging.
    - `saveBackupBeforeSimulation`:
        - `enabled`: true/false - If true it will copy the save file to filepath before running. This is a backup measure during development, in case the save file gets corrupted. 
        - `filepath`: string - The back up file path. Note this file will be overwritten every run if enabled.
    - `levelStart`: integer - Which SA level should we start the simulation from. Must be 1 <= levelStart <= Max unlocked level.
    - `levelEnd`: integer - Which SA level we should simulate up to. This can be either positive or negative (not 0). If negative, it is used as a delta from the max unlocked level. For example -1 will run the simulation up to the last unlocked level.
    - `trimpsSaveFilepath`: string - path to a file containing the trimps save string, exported from trimps.
    - `saveFilePath`: string - path to a save file containing data useful for this project. This is generated when needed, as long as you keep it as a valid path, it doesn't matter if it doesn't exist.
    - `headless`: true/false - if false it will show the browser window the simulations are running on. This is useful for development, but should be left as true otherwise.
    - `devtools`: true/false - if true it will open the dev tools for each simulation as they run. This is useful for development, but should be left as false otherwise.
- `simulator`: 
    - `name`: string - the name of the simulator to use (see [Simulators](#simulators)).
    - `simulatorSettings`: object - custom settings for the simulator. These depend on the simulator (again, see [Simulators](#simulators)).
## Simulators
A full list of current simulators:
- [Random Combo Simulator](#random-combo-simulator)
---
#### Random Combo Simulator

This simulator has 3 simulation stages:
1. It checks any existing (saved) builds we have. 
2. It generates a number of random builds based on the unlocked items we have.
3. It takes the best build from stages 1 and 2, and tries to see if the build can be improved by swapping one of the used items with an unused one.

##### Settings
- `framesPerSimulation`: integer - how many frames/ticks of combat should be simulated per build. Each represents 300ms of in-game time. The higher this number is, the less likely for random chance to influence the ranking of a build.
- `numberOfRandomSimulations`: integer - number of random builds to try,
- `updateSaveFile`: true/false - if true the save file (specified in the runner settings) will be updated with new information at the end of this run. This should almost always be true outside of development.
        

## 🚀Features
- Can run multiple simulations in parallel.
- Maintains a list of best builds that can be refined with each new run.
- Easily expandable to support a variety of different simulators.
- Fully configurable via a settings file.
- Easy to maintain when trimps updates (since we use the real trimps code to run the simulations).

## ▶️ Running
Currently there is no pre-compiled and easy to use version of the project. To run:
1. Install Node.js & yarn
2. Download this project from github (either via clone or zip)
    - if using clone, you will also need to pull the submodules.
3. Open the project folder in a command line
4. Run `yarn install` to download all dependencies.
5. Run `yarn start` to run the integration with the default settings file.
    - You can also run `node --loader ts-node/esm src/index.ts <settings-file>` to run with a different settings file.
