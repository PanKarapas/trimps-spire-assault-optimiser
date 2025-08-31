// Helper class, it takes a list of functions that produce a Promise of a certain type
// It then runs up to n of the promises in parallel, and returns once all the promises are done
export type PromiseFactory<T> = () => Promise<T>;

export class LimitedParallelRunner<T> {

    private promiseQueue: PromiseFactory<T>[] = [];
    private running: boolean = false;
    private maxParallel: number;
    public constructor(maxParallel: number) {
        if (!Number.isInteger(maxParallel) || maxParallel <= 0) {
            throw new Error("maxParallel must be a positive integer.");
        }
        this.maxParallel = maxParallel;
    }

    public push(newVal: PromiseFactory<T>) {
        this.promiseQueue.push(newVal);
    }
    public clear() {
        this.promiseQueue = [];
    }

    public async processQueue(): Promise<T[]> {
        if (this.running) {
            throw new Error("processQueue() is already running.");
        }
        this.running = true;
        try {
            // Snapshot and drain the queue so concurrent push/clear calls don't affect this run.
            const queue = this.promiseQueue.splice(0);
            const results = new Array<T>(queue.length);
            let nextIndex = 0;

            const runOne = async (): Promise<void> => {
                // Iterative worker to avoid deep async recursion.
                while (true) {
                    const currentIndex = nextIndex++;
                    if (currentIndex >= queue.length) {
                        return;
                    }
                    const fn = queue[currentIndex];
                    if (typeof fn !== "function") {
                        throw new Error(`Got an undefined promise factory at index ${currentIndex}.`);
                    }
                    results[currentIndex] = await fn();
                }
            };

            // Start up to maxParallel workers; they will drain the snapshot.
            const workerCount = Math.min(queue.length, this.maxParallel);
            const workers = Array.from({ length: workerCount }, () => runOne());
            await Promise.all(workers);
            return results;
        } finally {
            this.running = false;
        }
    }
}