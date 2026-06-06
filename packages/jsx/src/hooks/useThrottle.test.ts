import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, runEffects, destroyFiber,
} from '../hooks.js';
import { useThrottle } from './useThrottle.js';

// Helper to run rendering cycles in our in-memory Fiber test harness
function renderWithFiber<T>(fiber: ReturnType<typeof createFiber>, fn: () => T): T {
    setCurrentFiber(fiber);
    const result = fn();
    clearCurrentFiber();
    runEffects(fiber);
    return result;
}

describe('useThrottle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setRequestRender(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        clearCurrentFiber();
    });

    it('returns the initial value immediately', () => {
        const fiber = createFiber();
        const throttled = renderWithFiber(fiber, () => useThrottle('hello', 300));
        expect(throttled).toBe('hello');
        destroyFiber(fiber);
    });

    it('limits updates to at most once per intervalMs', () => {
        const fiber = createFiber();

        // 1. Initial render (mounts, updates immediately to 'hello' and starts the first throttle window)
        let throttled = renderWithFiber(fiber, () => useThrottle('hello', 300));
        expect(throttled).toBe('hello');

        // 2. Change value to 'world' at 50ms (since we are inside the 300ms throttle window, this is throttled)
        vi.advanceTimersByTime(50);
        throttled = renderWithFiber(fiber, () => useThrottle('world', 300));
        expect(throttled).toBe('hello'); // Remains 'hello'

        // 3. Keep updating value (should remain throttled)
        vi.advanceTimersByTime(100);
        throttled = renderWithFiber(fiber, () => useThrottle('foo', 300));
        expect(throttled).toBe('hello'); // Still 'hello'

        vi.advanceTimersByTime(50);
        throttled = renderWithFiber(fiber, () => useThrottle('bar', 300));
        expect(throttled).toBe('hello'); // Still 'hello'

        // 4. Advance past the end of the first interval (300ms total)
        vi.advanceTimersByTime(100);
        
        // Render again to verify it has now picked up the latest value ('bar')
        throttled = renderWithFiber(fiber, () => useThrottle('bar', 300));
        expect(throttled).toBe('bar');

        destroyFiber(fiber);
    });

    it('always emits the latest value when the interval fires', () => {
        const fiber = createFiber();

        // Start with 'a'
        let throttled = renderWithFiber(fiber, () => useThrottle('a', 300));
        expect(throttled).toBe('a');

        // Change values rapidly
        vi.advanceTimersByTime(50);
        throttled = renderWithFiber(fiber, () => useThrottle('b', 300));
        
        vi.advanceTimersByTime(50);
        throttled = renderWithFiber(fiber, () => useThrottle('c', 300));
        
        vi.advanceTimersByTime(50);
        throttled = renderWithFiber(fiber, () => useThrottle('d', 300));

        // Still inside first 300ms throttle window, should be 'a'
        expect(throttled).toBe('a');

        // Advance past the 300ms timer
        vi.advanceTimersByTime(150);

        // Render again: it must pick up 'd' (the latest value)
        throttled = renderWithFiber(fiber, () => useThrottle('d', 300));
        expect(throttled).toBe('d');

        destroyFiber(fiber);
    });

    it('emits the first change immediately if called after intervalMs has passed since mount', () => {
        const fiber = createFiber();

        // Mount
        let throttled = renderWithFiber(fiber, () => useThrottle('hello', 300));
        expect(throttled).toBe('hello');

        // Let the first throttle window expire (no new updates came in)
        vi.advanceTimersByTime(300);

        // Change value (since no timer is running, it should update immediately)
        renderWithFiber(fiber, () => useThrottle('world', 300));
        // Re-render to pick up the state update
        throttled = renderWithFiber(fiber, () => useThrottle('world', 300));
        expect(throttled).toBe('world');

        destroyFiber(fiber);
    });
});
