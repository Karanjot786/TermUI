// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Stopwatch widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { Stopwatch } from './Stopwatch.js';

/** Helper: create a Stopwatch, give it a rect, render to a screen, return both. */
function renderStopwatch(
    elapsed: number,
    options: ConstructorParameters<typeof Stopwatch>[0] = {},
    width = 20,
    height = 1,
) {
    const sw = new Stopwatch(options);
    // Seed elapsed directly to test rendering without running a real timer
    (sw as any)._elapsed = elapsed;
    const screen = new Screen(width, height);
    sw.updateRect({ x: 0, y: 0, width, height });
    sw.render(screen);
    return { sw, screen };
}

/** Read a single row from the back buffer as a plain string. */
function rowText(screen: Screen, row = 0): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

// ── 1. Stopwatch renders correctly ───────────────────────────────────────────
describe('Stopwatch – rendering', () => {
    it('renders 00:00.00 at zero elapsed time', () => {
        const { screen } = renderStopwatch(0);
        expect(rowText(screen)).toBe('00:00.00');
    });

    it('renders MM:SS.ms format correctly', () => {
        // 75_420 ms = 1 min 15 sec 42 centiseconds → 01:15.42
        const { screen } = renderStopwatch(75_420);
        expect(rowText(screen)).toBe('01:15.42');
    });

    it('renders minutes correctly when elapsed time exceeds 60 seconds', () => {
        // 65_000 ms = 1 min 5 sec 0 cs → 01:05.00
        const { screen } = renderStopwatch(65_000);
        expect(rowText(screen)).toBe('01:05.00');
    });

    it('renders nothing when the content rect has zero width', () => {
        expect(() => renderStopwatch(0, {}, 0, 1)).not.toThrow();
    });
});

// ── 2. Stopwatch increments elapsed time ─────────────────────────────────────
describe('Stopwatch – increments', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('getElapsed() increases while running', () => {
        const sw = new Stopwatch({ interval: 10 });
        sw.start();

        vi.advanceTimersByTime(500);
        const elapsed = sw.getElapsed();
        expect(elapsed).toBeGreaterThanOrEqual(500);
        sw.destroy();
    });

    it('calls markDirty on each tick', () => {
        const sw = new Stopwatch({ interval: 10 });
        sw.start();
        sw.clearDirty();

        vi.advanceTimersByTime(10);
        expect(sw.isDirty).toBe(true);
        sw.destroy();
    });

    it('isRunning() returns true after start()', () => {
        const sw = new Stopwatch();
        sw.start();
        expect(sw.isRunning()).toBe(true);
        sw.destroy();
    });
});

// ── 3. stop() pauses the elapsed counter ─────────────────────────────────────
describe('Stopwatch – stop() pauses', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('stop() halts the stopwatch so elapsed does not grow', () => {
        const sw = new Stopwatch({ interval: 10 });
        sw.start();
        vi.advanceTimersByTime(100);
        sw.stop();

        const elapsedAtStop = sw.getElapsed();

        // Advance more time — stopwatch should stay frozen
        vi.advanceTimersByTime(200);
        expect(sw.getElapsed()).toBe(elapsedAtStop);
        sw.destroy();
    });

    it('isRunning() returns false after stop()', () => {
        const sw = new Stopwatch();
        sw.start();
        sw.stop();
        expect(sw.isRunning()).toBe(false);
    });

    it('stop() is a no-op when already stopped', () => {
        const sw = new Stopwatch();
        expect(() => sw.stop()).not.toThrow();
    });
});

// ── 4. reset() returns elapsed to zero ────────────────────────────────────────
describe('Stopwatch – reset() returns to zero', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('reset() sets elapsed to 0', () => {
        const sw = new Stopwatch({ interval: 10 });
        sw.start();
        vi.advanceTimersByTime(300);
        sw.reset();
        expect(sw.getElapsed()).toBe(0);
    });

    it('reset() stops the stopwatch', () => {
        const sw = new Stopwatch();
        sw.start();
        sw.reset();
        expect(sw.isRunning()).toBe(false);
    });

    it('reset() marks widget dirty', () => {
        const sw = new Stopwatch();
        sw.clearDirty();
        sw.reset();
        expect(sw.isDirty).toBe(true);
    });
});

// ── 5. start() is idempotent ──────────────────────────────────────────────────
describe('Stopwatch – start() idempotency', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('start() is a no-op when already running', () => {
        const sw = new Stopwatch();
        sw.start();
        const idBefore = (sw as any)._intervalId;
        sw.start();
        const idAfter = (sw as any)._intervalId;
        expect(idBefore).toBe(idAfter);
        sw.destroy();
    });
});

// ── 6. destroy() clears the interval ─────────────────────────────────────────
describe('Stopwatch – destroy()', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('clears the intervalId after destroy()', () => {
        const sw = new Stopwatch();
        sw.start();
        sw.destroy();
        expect((sw as any)._intervalId).toBeUndefined();
    });
});

// ── 7. setInterval() mutation behavior ───────────────────────────────────
describe('Stopwatch – setInterval()', () => {
    it('setInterval marks widget dirty', () => {
        const sw = new Stopwatch({ interval: 10 });

        sw.clearDirty();
        sw.setInterval(20);

        expect(sw.isDirty).toBe(true);
    });

    it('does not mark dirty when interval is unchanged', () => {
        const sw = new Stopwatch({ interval: 10 });

        sw.clearDirty();
        sw.setInterval(10);

        expect(sw.isDirty).toBe(false);
    });

    it('updates interval value', () => {
        const sw = new Stopwatch({ interval: 10 });

        sw.setInterval(25);

        expect(sw.getInterval()).toBe(25);
    });
});

