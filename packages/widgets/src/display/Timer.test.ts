// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Timer widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { Timer } from './Timer.js';

/** Helper: create a Timer, give it a rect, render to a screen, return both. */
function renderTimer(
    options: ConstructorParameters<typeof Timer>[0],
    style: ConstructorParameters<typeof Timer>[1] = {},
    width = 20,
    height = 1,
) {
    const timer = new Timer(options, style);
    const screen = new Screen(width, height);
    timer.updateRect({ x: 0, y: 0, width, height });
    timer.render(screen);
    return { timer, screen };
}

/** Read a single row from the back buffer as a plain string. */
function rowText(screen: Screen, row = 0): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

// ── 1. Timer renders correctly ────────────────────────────────────────────────
describe('Timer – rendering', () => {
    it('renders MM:SS for a duration < 1 hour', () => {
        const { screen } = renderTimer({ duration: 30_000 }); // 30 seconds
        const text = rowText(screen);
        expect(text).toBe('00:30');
    });

    it('renders HH:MM:SS for a duration >= 1 hour', () => {
        const { screen } = renderTimer({ duration: 3_600_000 }); // exactly 1 hour
        const text = rowText(screen);
        expect(text).toBe('01:00:00');
    });

    it('renders 00:00 when remaining time is zero', () => {
        const timer = new Timer({ duration: 5_000 });
        // Force remaining to 0
        (timer as any)._remaining = 0;
        const screen = new Screen(20, 1);
        timer.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        timer.render(screen);
        expect(rowText(screen)).toBe('00:00');
    });

    it('renders correctly for a 90-second duration (01:30)', () => {
        const { screen } = renderTimer({ duration: 90_000 });
        expect(rowText(screen)).toBe('01:30');
    });

    it('renders nothing when the content rect has zero width', () => {
        expect(() => renderTimer({ duration: 30_000 }, {}, 0, 1)).not.toThrow();
    });
});

// ── 2. Timer fires onComplete ─────────────────────────────────────────────────
describe('Timer – onComplete callback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fires onComplete when countdown reaches zero', () => {
        const timer = new Timer({ duration: 3_000, interval: 1_000 });
        const onComplete = vi.fn();
        timer.onComplete = onComplete;

        timer.start();
        vi.advanceTimersByTime(3_000);

        expect(onComplete).toHaveBeenCalledTimes(1);
        timer.destroy();
    });

    it('does not fire onComplete before countdown reaches zero', () => {
        const timer = new Timer({ duration: 5_000, interval: 1_000 });
        const onComplete = vi.fn();
        timer.onComplete = onComplete;

        timer.start();
        vi.advanceTimersByTime(2_000);

        expect(onComplete).not.toHaveBeenCalled();
        timer.destroy();
    });

    it('marks dirty on each tick', () => {
        const timer = new Timer({ duration: 3_000, interval: 1_000 });
        timer.start();
        timer.clearDirty();

        vi.advanceTimersByTime(1_000);
        expect(timer.isDirty).toBe(true);
        timer.destroy();
    });

    it('isComplete() returns true after countdown finishes', () => {
        const timer = new Timer({ duration: 2_000, interval: 1_000 });
        timer.start();
        vi.advanceTimersByTime(2_000);

        expect(timer.isComplete()).toBe(true);
        timer.destroy();
    });
});

// ── 3. start() / stop() / reset() ────────────────────────────────────────────
describe('Timer – start / stop / reset', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('stop() pauses the countdown', () => {
        const timer = new Timer({ duration: 5_000, interval: 1_000 });
        timer.start();
        vi.advanceTimersByTime(2_000);  // remaining should be 3000
        timer.stop();

        const remainingAfterStop = timer.getRemaining();

        vi.advanceTimersByTime(3_000);  // time passes but timer is stopped
        expect(timer.getRemaining()).toBe(remainingAfterStop);
        timer.destroy();
    });

    it('reset() returns remaining time to full duration', () => {
        const timer = new Timer({ duration: 10_000, interval: 1_000 });
        timer.start();
        vi.advanceTimersByTime(4_000);
        timer.reset();

        expect(timer.getRemaining()).toBe(10_000);
        expect(timer.isComplete()).toBe(false);
        timer.destroy();
    });

    it('start() is a no-op when already running', () => {
        const timer = new Timer({ duration: 5_000, interval: 1_000 });
        timer.start();
        const idBefore = (timer as any)._intervalId;
        timer.start(); // should not create another interval
        const idAfter = (timer as any)._intervalId;
        expect(idBefore).toBe(idAfter);
        timer.destroy();
    });

    it('start() is a no-op when timer is already complete', () => {
        const timer = new Timer({ duration: 1_000, interval: 1_000 });
        timer.start();
        vi.advanceTimersByTime(1_000); // completes
        timer.start(); // should not restart
        expect((timer as any)._running).toBe(false);
        timer.destroy();
    });
});

// ── 4. destroy() clears the interval ─────────────────────────────────────────
describe('Timer – destroy()', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('clears the intervalId after destroy()', () => {
        const timer = new Timer({ duration: 5_000, interval: 1_000 });
        timer.start();
        timer.destroy();
        expect((timer as any)._intervalId).toBeUndefined();
    });
});

// ── 5. reset() optimization ───────────────────────────────────────────────
describe('Timer – reset() optimization', () => {
    it('marks dirty when reset changes state', () => {
        const timer = new Timer({ duration: 5000 });

        (timer as any)._remaining = 3000;

        timer.clearDirty();
        timer.reset();

        expect(timer.isDirty).toBe(true);
    });

    it('does not mark dirty when already reset', () => {
        const timer = new Timer({ duration: 5000 });

        timer.clearDirty();
        timer.reset();

        expect(timer.isDirty).toBe(false);
    });
});