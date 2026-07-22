// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for usePrevious hook
// ─────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, runEffects, destroyFiber,
} from '../hooks.js';
import { usePrevious } from './usePrevious.js';

function renderWithFiber<T>(fiber: ReturnType<typeof createFiber>, fn: () => T): T {
    setCurrentFiber(fiber);
    const result = fn();
    clearCurrentFiber();
    runEffects(fiber);
    return result;
}

describe('usePrevious', () => {
    beforeEach(() => {
        setRequestRender(() => {});
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('returns undefined on the first render', () => {
        const fiber = createFiber();

        const prev = renderWithFiber(fiber, () => usePrevious('first'));
        expect(prev).toBeUndefined();

        destroyFiber(fiber);
    });

    it('returns the value from the previous render after a second render', () => {
        const fiber = createFiber();

        renderWithFiber(fiber, () => usePrevious('first'));
        const prev = renderWithFiber(fiber, () => usePrevious('second'));

        expect(prev).toBe('first');

        destroyFiber(fiber);
    });

    it('tracks the previous value across multiple renders', () => {
        const fiber = createFiber();

        renderWithFiber(fiber, () => usePrevious(1));
        let prev = renderWithFiber(fiber, () => usePrevious(2));
        expect(prev).toBe(1);

        prev = renderWithFiber(fiber, () => usePrevious(3));
        expect(prev).toBe(2);

        prev = renderWithFiber(fiber, () => usePrevious(4));
        expect(prev).toBe(3);

        destroyFiber(fiber);
    });

    it('works with object values', () => {
        const fiber = createFiber();

        const objA = { id: 1 };
        const objB = { id: 2 };

        renderWithFiber(fiber, () => usePrevious(objA));
        const prev = renderWithFiber(fiber, () => usePrevious(objB));

        expect(prev).toBe(objA);

        destroyFiber(fiber);
    });
});
