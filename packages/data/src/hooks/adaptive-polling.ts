export interface AdaptivePollingOptions {
    baseInterval: number;
    minInterval?: number;
    maxInterval?: number;
    backoffFactor?: number;
}

export interface AdaptivePollingState {
    inFlight: boolean;
    skipped: number;
    failures: number;
    pressure: number;
    delay: number;
}

export class AdaptivePollingController {
    private state: AdaptivePollingState;
    private readonly minInterval: number;
    private readonly maxInterval: number;
    private readonly backoffFactor: number;

    constructor(private readonly options: AdaptivePollingOptions) {
        this.minInterval = options.minInterval ?? options.baseInterval;
        this.maxInterval = options.maxInterval ?? options.baseInterval * 16;
        this.backoffFactor = options.backoffFactor ?? 2;
        this.state = {
            inFlight: false,
            skipped: 0,
            failures: 0,
            pressure: 0,
            delay: this.clamp(options.baseInterval),
        };
    }

    begin(): boolean {
        if (this.state.inFlight) {
            this.state.skipped++;
            this.recalculate();
            return false;
        }
        this.state.inFlight = true;
        return true;
    }

    success(durationMs: number): void {
        this.state.inFlight = false;
        this.state.failures = 0;
        this.state.skipped = 0;
        this.state.pressure = Math.max(0, this.state.pressure - 1);
        if (durationMs > this.state.delay) {
            this.state.pressure++;
        }
        this.recalculate();
    }

    failure(): void {
        this.state.inFlight = false;
        this.state.failures++;
        this.state.pressure += 2;
        this.recalculate();
    }

    nextDelay(): number {
        return this.state.delay;
    }

    snapshot(): AdaptivePollingState {
        return { ...this.state };
    }

    private recalculate(): void {
        const pressureDelay = this.options.baseInterval * Math.pow(this.backoffFactor, this.state.pressure);
        const skippedDelay = this.state.skipped * this.options.baseInterval;
        this.state.delay = this.clamp(Math.max(pressureDelay, this.options.baseInterval + skippedDelay));
    }

    private clamp(value: number): number {
        return Math.max(this.minInterval, Math.min(this.maxInterval, Math.round(value)));
    }
}
