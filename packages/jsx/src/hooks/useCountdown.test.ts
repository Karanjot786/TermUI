// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useCountdown hook
// ─────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, runEffects, destroyFiber,
} from '../hooks.js';
import { useCountdown } from './useCountdown.js';

function renderWithFiber<T>(fiber: ReturnType<typeof createFiber>, fn: () => T): T {
    setCurrentFiber(fiber);
    const result = fn();
    clearCurrentFiber();
    runEffects(fiber);
    return result;
}

describe('useCountdown', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setRequestRender(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        clearCurrentFiber();
    });

    it('count starts at startValue and does not tick before start()', () => {
        const fiber = createFiber();

        const [count] = renderWithFiber(fiber, () => useCountdown(10));
        expect(count).toBe(10);

        vi.advanceTimersByTime(3000);

        const [count2] = renderWithFiber(fiber, () => useCountdown(10));
        expect(count2).toBe(10);

        destroyFiber(fiber);
    });

    it('start() begins decrementing count each interval', () => {
        const fiber = createFiber();

        const [, controls] = renderWithFiber(fiber, () => useCountdown(10));
        controls.start();
        renderWithFiber(fiber, () => useCountdown(10));

        vi.advanceTimersByTime(3000);

        const [count] = renderWithFiber(fiber, () => useCountdown(10));
        expect(count).toBe(7);

        destroyFiber(fiber);
    });

    it('count stops at zero and never goes negative', () => {
        const fiber = createFiber();

        renderWithFiber(fiber, () => useCountdown(3))[1].start();
        renderWithFiber(fiber, () => useCountdown(3));

        vi.advanceTimersByTime(10000);

        const [count] = renderWithFiber(fiber, () => useCountdown(3));
        expect(count).toBe(0);

        destroyFiber(fiber);
    });

    it('pause() halts ticking and keeps the current count', () => {
        const fiber = createFiber();

        renderWithFiber(fiber, () => useCountdown(10))[1].start();
        renderWithFiber(fiber, () => useCountdown(10));

        vi.advanceTimersByTime(3000);

        renderWithFiber(fiber, () => useCountdown(10))[1].pause();
        renderWithFiber(fiber, () => useCountdown(10));

        vi.advanceTimersByTime(3000);

        const [count] = renderWithFiber(fiber, () => useCountdown(10));
        expect(count).toBe(7);

        destroyFiber(fiber);
    });

    it('reset() restores count to startValue and stops ticking', () => {
        const fiber = createFiber();

        renderWithFiber(fiber, () => useCountdown(10))[1].start();
        renderWithFiber(fiber, () => useCountdown(10));

        vi.advanceTimersByTime(4000);

        renderWithFiber(fiber, () => useCountdown(10))[1].reset();
        renderWithFiber(fiber, () => useCountdown(10));

        vi.advanceTimersByTime(3000);

        const [count] = renderWithFiber(fiber, () => useCountdown(10));
        expect(count).toBe(10);

        destroyFiber(fiber);
    });
});