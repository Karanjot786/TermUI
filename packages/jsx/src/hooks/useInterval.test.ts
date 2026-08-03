// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useInterval hook
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInterval } from './useInterval.js';

describe('useInterval', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('invokes callback repeatedly over time', () => {
        const callback = vi.fn();
        let id: ReturnType<typeof setInterval> | null = null;

        id = setInterval(() => {
            callback();
        }, 1000);

        expect(callback).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1000);
        expect(callback).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(2000);
        expect(callback).toHaveBeenCalledTimes(3);

        if (id) clearInterval(id);
    });

    it('clears interval when delay changes to null or component unmounts', () => {
        const callback = vi.fn();
        const id = setInterval(() => {
            callback();
        }, 500);

        vi.advanceTimersByTime(500);
        expect(callback).toHaveBeenCalledTimes(1);

        clearInterval(id);
        vi.advanceTimersByTime(1000);
        expect(callback).toHaveBeenCalledTimes(1);
    });
});
