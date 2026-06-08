// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useStopwatch hook
// ─────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, runEffects, destroyFiber,
} from '../hooks.js';
import { useStopwatch } from './useStopwatch.js';

function renderWithFiber<T>(fiber: ReturnType<typeof createFiber>, fn: () => T): T {
    setCurrentFiber(fiber);
    const result = fn();
    clearCurrentFiber();
    runEffects(fiber);
    return result;
}

describe('useStopwatch', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setRequestRender(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        clearCurrentFiber();
    });

    it('elapsed starts at zero and does not advance before start()', () => {
        const fiber = createFiber();

        const [elapsed] = renderWithFiber(fiber, () => useStopwatch());
        expect(elapsed).toBe(0);

        vi.advanceTimersByTime(3000);

        const [elapsed2] = renderWithFiber(fiber, () => useStopwatch());
        expect(elapsed2).toBe(0);

        destroyFiber(fiber);
    });

    it('start() begins increasing elapsed time each interval', () => {
        const fiber = createFiber();

        const [, controls] = renderWithFiber(fiber, () => useStopwatch());
        controls.start();
        renderWithFiber(fiber, () => useStopwatch());

        vi.advanceTimersByTime(3000);

        const [elapsed] = renderWithFiber(fiber, () => useStopwatch());
        expect(elapsed).toBe(3000);

        destroyFiber(fiber);
    });

    it('pause() halts ticking and keeps the elapsed value', () => {
        const fiber = createFiber();

        renderWithFiber(fiber, () => useStopwatch())[1].start();
        renderWithFiber(fiber, () => useStopwatch());

        vi.advanceTimersByTime(2000);

        renderWithFiber(fiber, () => useStopwatch())[1].pause();
        renderWithFiber(fiber, () => useStopwatch());

        vi.advanceTimersByTime(2000);

        const [elapsed] = renderWithFiber(fiber, () => useStopwatch());
        expect(elapsed).toBe(2000);

        destroyFiber(fiber);
    });

    it('start() after pause() resumes from the kept value', () => {
        const fiber = createFiber();

        renderWithFiber(fiber, () => useStopwatch())[1].start();
        renderWithFiber(fiber, () => useStopwatch());

        vi.advanceTimersByTime(2000);

        renderWithFiber(fiber, () => useStopwatch())[1].pause();
        renderWithFiber(fiber, () => useStopwatch());

        renderWithFiber(fiber, () => useStopwatch())[1].start();
        renderWithFiber(fiber, () => useStopwatch());

        vi.advanceTimersByTime(1000);

        const [elapsed] = renderWithFiber(fiber, () => useStopwatch());
        expect(elapsed).toBe(3000);

        destroyFiber(fiber);
    });

    it('reset() returns elapsed to zero and stops ticking', () => {
        const fiber = createFiber();

        renderWithFiber(fiber, () => useStopwatch())[1].start();
        renderWithFiber(fiber, () => useStopwatch());

        vi.advanceTimersByTime(3000);

        renderWithFiber(fiber, () => useStopwatch())[1].reset();
        renderWithFiber(fiber, () => useStopwatch());

        vi.advanceTimersByTime(2000);

        const [elapsed, controls] = renderWithFiber(fiber, () => useStopwatch());
        expect(elapsed).toBe(0);
        expect(controls.isRunning).toBe(false);

        destroyFiber(fiber);
    });
});
