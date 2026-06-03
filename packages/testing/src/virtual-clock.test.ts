// ─────────────────────────────────────────────────────
// @termuijs/testing — Tests for createVirtualClock()
//
// Covers the clock in isolation and its integration
// with the motion timer pool.
// ─────────────────────────────────────────────────────

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createVirtualClock } from './virtual-clock.js';
import { timerPoolSubscribe, timerPoolUnsubscribeAll } from '@termuijs/motion';

afterEach(() => {
    // Always detach the clock between tests so nothing leaks.
    timerPoolUnsubscribeAll();
    vi.useRealTimers();
});

describe('createVirtualClock', () => {
    it('starts at 0', () => {
        const clock = createVirtualClock();
        expect(clock.now()).toBe(0);
    });

    it('advance(ms) moves now() forward by ms', () => {
        const clock = createVirtualClock();
        clock.advance(250);
        expect(clock.now()).toBe(250);

        clock.advance(750);
        expect(clock.now()).toBe(1000);
    });

    it('tick() advances by one 16ms frame', () => {
        const clock = createVirtualClock();
        clock.tick();
        expect(clock.now()).toBe(16);
        clock.tick();
        clock.tick();
        expect(clock.now()).toBe(48);
    });

    it('negative advance is a no-op', () => {
        const clock = createVirtualClock();
        clock.advance(100);
        clock.advance(-50);
        expect(clock.now()).toBe(100);
    });
});

describe('createVirtualClock — periodic timers', () => {
    it('fires a registered interval once per delayMs', () => {
        const clock = createVirtualClock();
        const calls: number[] = [];
        clock._setInterval(50, () => calls.push(clock.now()));

        clock.advance(200);
        expect(calls).toEqual([50, 100, 150, 200]);
    });

    it('does not fire when advance is shorter than delayMs', () => {
        const clock = createVirtualClock();
        const cb = vi.fn();
        clock._setInterval(100, cb);

        clock.advance(99);
        expect(cb).not.toHaveBeenCalled();

        clock.advance(1);
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('multiple intervals share the same clock', () => {
        const clock = createVirtualClock();
        const fast: number[] = [];
        const slow: number[] = [];
        clock._setInterval(25, () => fast.push(clock.now()));
        clock._setInterval(100, () => slow.push(clock.now()));

        clock.advance(200);

        expect(fast).toEqual([25, 50, 75, 100, 125, 150, 175, 200]);
        expect(slow).toEqual([100, 200]);
    });

    it('unsubscribe stops further fires', () => {
        const clock = createVirtualClock();
        const cb = vi.fn();
        const unsub = clock._setInterval(50, cb);

        clock.advance(100);
        expect(cb).toHaveBeenCalledTimes(2);

        unsub();
        clock.advance(100);
        expect(cb).toHaveBeenCalledTimes(2);
    });

    it('runs many fires in a single advance() in under 50ms wall time', () => {
        const clock = createVirtualClock();
        let count = 0;
        clock._setInterval(16, () => { count++; });

        const start = Date.now();
        clock.advance(2000);
        const elapsed = Date.now() - start;

        expect(count).toBe(125); // 2000 / 16
        expect(elapsed).toBeLessThan(50);
    });
});

describe('createVirtualClock — integration with timer pool', () => {
    it('a usage example: drives a timer pool subscriber synchronously', () => {
        // This is the canonical example from the issue spec.
        const clock = createVirtualClock();
        timerPoolSubscribe(clock);

        const seen: number[] = [];
        timerPoolSubscribe(100, () => seen.push(clock.now()));

        clock.advance(500);
        timerPoolUnsubscribeAll();

        expect(seen).toEqual([100, 200, 300, 400, 500]);
    });

    it('unsubscribeAll() detaches the clock so real timers are not used', () => {
        const clock = createVirtualClock();
        timerPoolSubscribe(clock);
        timerPoolUnsubscribeAll();

        // After detach, the clock should still work in isolation.
        expect(clock.now()).toBe(0);
        clock.advance(50);
        expect(clock.now()).toBe(50);
    });

    it('re-injecting a new clock replaces the old one', () => {
        const a = createVirtualClock();
        const b = createVirtualClock();

        timerPoolSubscribe(a);
        const calls: string[] = [];
        timerPoolSubscribe(50, () => calls.push(`a:${a.now()}`));

        a.advance(100);
        expect(calls).toEqual(['a:50', 'a:100']);

        // Swap in clock b. Existing subscribers should follow the new clock.
        timerPoolSubscribe(b);
        timerPoolSubscribe(50, () => calls.push(`b:${b.now()}`));

        b.advance(100);
        timerPoolUnsubscribeAll();

        expect(calls).toEqual([
            'a:50', 'a:100',
            'b:50', 'b:100',
        ]);
    });

    it('a 2000ms animation sequence completes in under 50ms wall time', () => {
        // Models the issue acceptance criteria: a long animation
        // that would normally sleep finishes almost instantly.
        const clock = createVirtualClock();
        timerPoolSubscribe(clock);

        let frames = 0;
        timerPoolSubscribe(16, () => { frames++; });

        const start = Date.now();
        clock.advance(2000);
        const elapsed = Date.now() - start;

        timerPoolUnsubscribeAll();

        expect(frames).toBe(125);
        expect(elapsed).toBeLessThan(50);
    });
});
