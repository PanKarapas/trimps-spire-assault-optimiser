import { MultiBar, SingleBar } from 'cli-progress';

export interface ProgressCreate {
    total: number,
    level: number,
    lastLog?: string,
    masterProgressBarId: number
}

export interface ProgressCreateMaster {
    numberOfChildBars: number,
    name: string
}

export class ProgressBarManager {
    private static singleton?: ProgressBarManager;
    private cliProgress: MultiBar;
    private barMap = new Map<number, { masterBarId: number, bar: SingleBar }>();
    private masterBarMap = new Map<number, SingleBar>();
    // has to be >= 1
    private static masterUpdatesPerChild = 50;
    public static getInstance(): ProgressBarManager {
        if (ProgressBarManager.singleton) {
            return ProgressBarManager.singleton;
        }
        ProgressBarManager.singleton = new ProgressBarManager();
        return ProgressBarManager.singleton;
    }

    private constructor() {
        this.cliProgress = new MultiBar({
            clearOnComplete: true,
            hideCursor: true,
            format: '{bar} | level {level} | {percentage}% | {lastLog}',
            autopadding: true
        });
    }

    public stop() {
        this.cliProgress.stop();
    }

    public createMasterBar(id: number, create: ProgressCreateMaster) {
        if (!this.masterBarMap.has(id)) {
            const bar = this.cliProgress.create(
                create.numberOfChildBars * ProgressBarManager.masterUpdatesPerChild,
                0,
                { name: create.name },
                {
                    clearOnComplete: false,
                    format: '{bar} | {name} | {eta}s remaining',
                    barCompleteChar: '█',
                    barIncompleteChar: '░',
                    etaBuffer: 20
                }
            )

            this.masterBarMap.set(id, bar);
        } else {
            throw new Error(`Tried to create a master bar with the same id as an existing bar ${id}`);
        }
    }

    public createBar(id: number, create: ProgressCreate) {
        if (!this.barMap.has(id)) {
            this.barMap.set(id, { masterBarId: create.masterProgressBarId, bar: this.cliProgress.create(create.total, 0, { level: `${create.level}`.padEnd(3) }) });
        } else {
            throw new Error(`Tried to create a second bar with the same id as an existing bar ${id}`);
        }
    }

    public incrementBar(id: number): void {
        const found = this.barMap.get(id);

        if (!found) {
            throw new Error(`Tried to increment progress bar before it was created/after it was removed: ${id}`);
        }
        const { bar, masterBarId } = found;
        // 0 to ProgressBarManager.masterUpdatesPerChild
        const progressBefore = Math.floor(bar.getProgress() * ProgressBarManager.masterUpdatesPerChild);
        bar.increment();
        const progressAfter =  Math.floor(bar.getProgress() * ProgressBarManager.masterUpdatesPerChild);

        if(progressAfter > progressBefore) {
            let masterBar = this.masterBarMap.get(masterBarId);
            if (!masterBar) {
                throw new Error(`Tried to increment master bar before it was created/after it was removed: ${masterBarId}`);
            } else {
                masterBar.increment(progressAfter-progressBefore);
            }
        }
    }

    public removeBar(id: number) {
        const found = this.barMap.get(id);

        if (!found) {
            throw new Error(`Tried to remove progress bar before it was created/after it was removed: ${id}`);
        }

        const { bar } = found;
        this.cliProgress.remove(bar);
    }

    public updateLastLog(id: number, text: string) {
        const found = this.barMap.get(id);

        if (!found) {
            throw new Error(`Tried to log to a progress bar before it was created/after it was removed: ${id}`);
        }
        const { bar } = found;
        bar.update({ lastLog: text });
    }
}

export const progressBarManager = ProgressBarManager.getInstance();

export function logProgressBar(id: number, text: string) {
    progressBarManager.updateLastLog(id, text);
}

export function incrementProgressBar(id: number) {
    progressBarManager.incrementBar(id);
}

export function createMasterProgressBar(id: number, create: ProgressCreateMaster) {
    progressBarManager.createMasterBar(id, create);
}

export function createProgressBar(id: number, create: ProgressCreate) {
    progressBarManager.createBar(id, create);
}

export function removeProgressBar(id: number) {
    progressBarManager.removeBar(id);
}