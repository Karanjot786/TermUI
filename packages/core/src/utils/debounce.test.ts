// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for debounce utility
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { debounce } from './debounce.js';

describe('debounce', () => {
    it('delays function execution', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced('hello');
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('hello');

        vi.useRealTimers();
    });

    it('only executes once for rapid calls', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced('a');
        debounced('b');
        debounced('c');

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenLastCalledWith('c');

        vi.useRealTimers();
    });

    it('resets timer on each call', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced('first');
        vi.advanceTimersByTime(50);
        debounced('second');
        vi.advanceTimersByTime(50);

        // Timer was reset, so function shouldn't be called yet
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('second');

        vi.useRealTimers();
    });

    it('cancel prevents execution', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced('hello');
        debounced.cancel();

        vi.advanceTimersByTime(200);
        expect(fn).not.toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('leading option invokes immediately', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100, { leading: true });

        debounced('first');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('first');

        // Subsequent rapid calls shouldn't invoke again
        debounced('second');
        debounced('third');
        expect(fn).toHaveBeenCalledTimes(1);

        vi.useRealTimers();
    });

    it('trailing: false prevents trailing execution', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100, { trailing: false });

        debounced('hello');
        vi.advanceTimersByTime(200);
        expect(fn).not.toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('works with multiple arguments', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced('arg1', 42, true);
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledWith('arg1', 42, true);

        vi.useRealTimers();
    });

    it('can be called again after completion', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced('first');
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);

        debounced('second');
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(2);
        expect(fn).toHaveBeenLastCalledWith('second');

        vi.useRealTimers();
    });
});