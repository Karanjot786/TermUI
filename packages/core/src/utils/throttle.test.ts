// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for throttle utility
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { throttle } from './throttle.js';

describe('throttle', () => {
    it('executes immediately on the first call (leading)', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled('hello');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('hello');

        vi.useRealTimers();
    });

    it('throttles rapid calls and executes on the trailing edge', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled('a');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenLastCalledWith('a');

        throttled('b');
        throttled('c');
        expect(fn).toHaveBeenCalledTimes(1); // Throttled

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(2); // Executed trailing call
        expect(fn).toHaveBeenLastCalledWith('c');

        vi.useRealTimers();
    });

    it('does not trigger trailing call if no subsequent calls occur', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled('only-one');
        expect(fn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1); // No trailing invocation

        vi.useRealTimers();
    });

    it('respects leading: false', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const throttled = throttle(fn, 100, { leading: false });

        throttled('first');
        expect(fn).not.toHaveBeenCalled(); // No leading call

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1); // Trailing call triggers
        expect(fn).toHaveBeenCalledWith('first');

        vi.useRealTimers();
    });

    it('respects trailing: false', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const throttled = throttle(fn, 100, { trailing: false });

        throttled('a');
        expect(fn).toHaveBeenCalledTimes(1);

        throttled('b');
        throttled('c');
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1); // Trailing was disabled, so no extra calls

        vi.useRealTimers();
    });

    it('supports cancellation', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled('a');
        throttled('b');
        throttled.cancel();

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1); // Only the initial leading call triggered, trailing cancelled
        expect(fn).not.toHaveBeenCalledWith('b');

        vi.useRealTimers();
    });

    it('works with multiple arguments and preserves types', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled('arg1', 42, true);
        expect(fn).toHaveBeenCalledWith('arg1', 42, true);

        vi.useRealTimers();
    });

    it('resets throttle after the wait time elapsed', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled('first');
        expect(fn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(101);

        throttled('second');
        expect(fn).toHaveBeenCalledTimes(2);
        expect(fn).toHaveBeenLastCalledWith('second');

        vi.useRealTimers();
    });
});
