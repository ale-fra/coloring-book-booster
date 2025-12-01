export class RateLimiter {
    private timestamps: number[] = [];
    private queue: (() => void)[] = [];
    private readonly maxRequests: number;
    private readonly windowMs: number;
    private timer: NodeJS.Timeout | null = null;

    constructor(maxRequests: number, windowMs: number) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    async acquire(): Promise<void> {
        const now = Date.now();
        this.cleanup(now);

        if (this.timestamps.length < this.maxRequests) {
            this.timestamps.push(now);
            return;
        }

        return new Promise<void>((resolve) => {
            this.queue.push(resolve);
            this.scheduleProcess();
        });
    }

    private cleanup(now: number) {
        const threshold = now - this.windowMs;
        while (this.timestamps.length > 0 && this.timestamps[0] <= threshold) {
            this.timestamps.shift();
        }
    }

    private scheduleProcess() {
        if (this.timer) {
            return;
        }

        if (this.timestamps.length === 0) {
            // Should not happen if queue is not empty, but safe guard
            this.processQueue();
            return;
        }

        const nextFreeTime = this.timestamps[0] + this.windowMs;
        const now = Date.now();
        const delay = Math.max(0, nextFreeTime - now);

        this.timer = setTimeout(() => {
            this.timer = null;
            this.processQueue();
        }, delay);
    }

    private processQueue() {
        const now = Date.now();
        this.cleanup(now);

        while (this.queue.length > 0 && this.timestamps.length < this.maxRequests) {
            const resolve = this.queue.shift();
            if (resolve) {
                this.timestamps.push(Date.now());
                resolve();
            }
        }

        if (this.queue.length > 0) {
            this.scheduleProcess();
        }
    }
}
