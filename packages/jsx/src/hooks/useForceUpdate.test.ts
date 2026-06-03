// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useForceUpdate hook
// ─────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, runEffects, destroyFiber,
} from '../hooks.js';
import { useForceUpdate } from './useForceUpdate.js';

function renderWithFiber<T>(fiber: ReturnType<typeof createFiber>, fn: () => T): T {
    setCurrentFiber(fiber);
    const result = fn();
    clearCurrentFiber();
    runEffects(fiber);
    return result;
}

describe('useForceUpdate', () => {
    beforeEach(() => {
        setRequestRender(() => {});
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('returns a function', () => {
        const fiber = createFiber();
        const forceUpdate = renderWithFiber(fiber, () => useForceUpdate());
        expect(typeof forceUpdate).toBe('function');
        destroyFiber(fiber);
    });

    it('calling the function marks fiber as dirty', () => {
        const fiber = createFiber();
        fiber.isDirty = false;

        const forceUpdate = renderWithFiber(fiber, () => useForceUpdate());
        forceUpdate();

        expect(fiber.isDirty).toBe(true);
        destroyFiber(fiber);
    });

    it('returned function identity stays stable across re-renders', () => {
        const fiber = createFiber();

        const first = renderWithFiber(fiber, () => useForceUpdate());
        const second = renderWithFiber(fiber, () => useForceUpdate());

        expect(first).toBe(second);
        destroyFiber(fiber);
    });

    it('each call marks fiber dirty again', () => {
        const fiber = createFiber();
        const forceUpdate = renderWithFiber(fiber, () => useForceUpdate());

        fiber.isDirty = false;
        forceUpdate();
        expect(fiber.isDirty).toBe(true);

        fiber.isDirty = false;
        forceUpdate();
        expect(fiber.isDirty).toBe(true);

        destroyFiber(fiber);
    });

    it('the function takes no arguments and returns nothing', () => {
        const fiber = createFiber();
        const forceUpdate = renderWithFiber(fiber, () => useForceUpdate());

        const result = forceUpdate();
        expect(result).toBeUndefined();
        destroyFiber(fiber);
    });
});
