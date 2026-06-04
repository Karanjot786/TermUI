// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useDebounce hook
// ─────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, runEffects, destroyFiber,
} from '../hooks.js';
import { useDebounce } from './useDebounce.js';

function renderWithFiber<T>(fiber: ReturnType<typeof createFiber>, fn: () => T): T {
    setCurrentFiber(fiber);
    const result = fn();
    clearCurrentFiber();
    runEffects(fiber);
    return result;
}

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setRequestRender(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        clearCurrentFiber();
    });

    it('returns updated value after delayMs ms of no new input', () => {
        const fiber = createFiber();

        // First render with initial value
        let debounced = renderWithFiber(fiber, () => useDebounce('hello', 300));
        expect(debounced).toBe('hello');

        // Simulate re-render with new value
        debounced = renderWithFiber(fiber, () => useDebounce('world', 300));

        // Before delay — should still be old value
        expect(debounced).toBe('hello');

        // Advance past delay
        vi.advanceTimersByTime(300);

        // Now re-render to pick up new state
        debounced = renderWithFiber(fiber, () => useDebounce('world', 300));
        expect(debounced).toBe('world');

        destroyFiber(fiber);
    });

    it('does NOT update while new inputs arrive faster than delayMs', () => {
        const fiber = createFiber();

        // Initial render
        renderWithFiber(fiber, () => useDebounce('a', 300));

        // Rapid updates before delay elapses
        renderWithFiber(fiber, () => useDebounce('b', 300));
        vi.advanceTimersByTime(100);

        renderWithFiber(fiber, () => useDebounce('c', 300));
        vi.advanceTimersByTime(100);

        renderWithFiber(fiber, () => useDebounce('d', 300));
        vi.advanceTimersByTime(100);

        // Only 300ms has passed since last update — should not have settled
        let debounced = renderWithFiber(fiber, () => useDebounce('d', 300));
        expect(debounced).toBe('a');

        // Now let the full delay elapse
        vi.advanceTimersByTime(300);
        debounced = renderWithFiber(fiber, () => useDebounce('d', 300));
        expect(debounced).toBe('d');

        destroyFiber(fiber);
    });

    it('resets the timer when delayMs changes', () => {
        const fiber = createFiber();

        // Initial render
        renderWithFiber(fiber, () => useDebounce('hello', 300));

        // Change value
        renderWithFiber(fiber, () => useDebounce('world', 300));
        vi.advanceTimersByTime(200);

        // Change delayMs — should reset the timer
        renderWithFiber(fiber, () => useDebounce('world', 500));
        vi.advanceTimersByTime(300);

        // 300ms elapsed after delayMs change but new delay is 500ms — not settled yet
        let debounced = renderWithFiber(fiber, () => useDebounce('world', 500));
        expect(debounced).toBe('hello');

        // Advance remaining 200ms
        vi.advanceTimersByTime(200);
        debounced = renderWithFiber(fiber, () => useDebounce('world', 500));
        expect(debounced).toBe('world');

        destroyFiber(fiber);
    });
});
