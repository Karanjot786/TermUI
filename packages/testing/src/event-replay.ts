export type ReplayEvent =
    | { type: 'input'; at: number; key: string }
    | { type: 'frame'; at: number; buffer: string }
    | { type: 'resize'; at: number; width: number; height: number }
    | { type: 'wait'; at: number; ms: number };

export interface ReplayDriver {
    input?: (key: string) => void | Promise<void>;
    frame?: (buffer: string) => void | Promise<void>;
    resize?: (width: number, height: number) => void | Promise<void>;
    wait?: (ms: number) => void | Promise<void>;
}

export interface ReplaySessionSnapshot {
    version: 1;
    events: ReplayEvent[];
}

export class ReplaySession {
    private events: ReplayEvent[] = [];
    private start = Date.now();

    record(event: Omit<ReplayEvent, 'at'> & { at?: number }): ReplayEvent {
        const replayEvent = {
            ...event,
            at: event.at ?? Date.now() - this.start,
        } as ReplayEvent;
        this.events.push(replayEvent);
        this.events.sort((a, b) => a.at - b.at);
        return replayEvent;
    }

    input(key: string, at?: number): ReplayEvent {
        return this.record({ type: 'input', key, at });
    }

    frame(buffer: string, at?: number): ReplayEvent {
        return this.record({ type: 'frame', buffer, at });
    }

    resize(width: number, height: number, at?: number): ReplayEvent {
        return this.record({ type: 'resize', width, height, at });
    }

    wait(ms: number, at?: number): ReplayEvent {
        return this.record({ type: 'wait', ms, at });
    }

    snapshot(): ReplaySessionSnapshot {
        return { version: 1, events: this.events.map(event => ({ ...event })) };
    }

    clear(): void {
        this.events = [];
        this.start = Date.now();
    }

    async replay(driver: ReplayDriver): Promise<void> {
        let cursor = 0;
        for (const event of this.events) {
            const gap = Math.max(0, event.at - cursor);
            if (gap > 0) await driver.wait?.(gap);
            cursor = event.at;

            if (event.type === 'input') await driver.input?.(event.key);
            if (event.type === 'frame') await driver.frame?.(event.buffer);
            if (event.type === 'resize') await driver.resize?.(event.width, event.height);
            if (event.type === 'wait') {
                await driver.wait?.(event.ms);
                cursor += event.ms;
            }
        }
    }

    static from(snapshot: ReplaySessionSnapshot): ReplaySession {
        const session = new ReplaySession();
        session.events = snapshot.events.map(event => ({ ...event }));
        return session;
    }
}
