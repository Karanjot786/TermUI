import { describe, expect, it, vi } from 'vitest';
import { ReplaySession } from './event-replay.js';

describe('ReplaySession', () => {
    it('records structured events in timestamp order', () => {
        const session = new ReplaySession();

        session.input('enter', 20);
        session.frame('ready', 5);

        expect(session.snapshot().events.map(event => event.type)).toEqual(['frame', 'input']);
    });

    it('replays waits and typed events through a driver', async () => {
        const session = new ReplaySession();
        const calls: string[] = [];

        session.input('a', 10);
        session.resize(80, 24, 25);
        session.frame('done', 30);

        await session.replay({
            wait: async ms => { calls.push(`wait:${ms}`); },
            input: async key => { calls.push(`input:${key}`); },
            resize: async (width, height) => { calls.push(`resize:${width}x${height}`); },
            frame: async buffer => { calls.push(`frame:${buffer}`); },
        });

        expect(calls).toEqual([
            'wait:10',
            'input:a',
            'wait:15',
            'resize:80x24',
            'wait:5',
            'frame:done',
        ]);
    });

    it('restores sessions from snapshots without sharing event objects', () => {
        const session = new ReplaySession();
        session.input('tab', 1);

        const restored = ReplaySession.from(session.snapshot());
        const snapshot = restored.snapshot();
        snapshot.events[0].at = 99;

        expect(restored.snapshot().events[0].at).toBe(1);
    });

    it('supports explicit wait events', async () => {
        const session = new ReplaySession();
        const wait = vi.fn();
        session.wait(50, 0);

        await session.replay({ wait });

        expect(wait).toHaveBeenCalledWith(50);
    });
});
