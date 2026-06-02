import { describe, it, expect, afterEach } from 'vitest';
import { clearCurrentFiber, createFiber, setCurrentFiber } from '../hooks.js';
import { useCounter } from './useCounter.js';

function renderCounter(
    fiber = createFiber(),
    initialValue?: number,
    opts?: { min?: number; max?: number; step?: number },
) {
    fiber.hookIndex = 0;
    setCurrentFiber(fiber);
    const result = useCounter(initialValue, opts);
    clearCurrentFiber();

    return { fiber, result };
}

describe('useCounter', () => {
    afterEach(() => {
        clearCurrentFiber();
    });

    it('increment() increases the counter by step defaulting to 1', () => {
        const { fiber, result } = renderCounter(undefined, 0);
        const [, actions] = result;

        actions.increment();

        const [, nextResult] = renderCounter(fiber, 0).result;
        expect(nextResult.increment).toBeTypeOf('function');
        expect(renderCounter(fiber, 0).result[0]).toBe(1);
    });

    it('increment() increases the counter by the configured step', () => {
        const { fiber, result } = renderCounter(undefined, 2, { step: 3 });
        const [, actions] = result;

        actions.increment();

        expect(renderCounter(fiber, 2, { step: 3 }).result[0]).toBe(5);
    });

    it('decrement() decreases the counter by step', () => {
        const { fiber, result } = renderCounter(undefined, 10, { step: 4 });
        const [, actions] = result;

        actions.decrement();

        expect(renderCounter(fiber, 10, { step: 4 }).result[0]).toBe(6);
    });

    it('counter does not exceed max or go below min when set', () => {
        const { fiber, result } = renderCounter(undefined, 5, { min: 0, max: 10 });
        const [, actions] = result;

        actions.set(25);
        expect(renderCounter(fiber, 5, { min: 0, max: 10 }).result[0]).toBe(10);

        renderCounter(fiber, 5, { min: 0, max: 10 }).result[1].set(-5);
        expect(renderCounter(fiber, 5, { min: 0, max: 10 }).result[0]).toBe(0);
    });

    it('increment() and decrement() respect min and max bounds', () => {
        const { fiber, result } = renderCounter(undefined, 9, { min: 0, max: 10, step: 3 });
        const [, actions] = result;

        actions.increment();
        expect(renderCounter(fiber, 9, { min: 0, max: 10, step: 3 }).result[0]).toBe(10);

        renderCounter(fiber, 9, { min: 0, max: 10, step: 3 }).result[1].set(1);
        renderCounter(fiber, 9, { min: 0, max: 10, step: 3 }).result[1].decrement();
        expect(renderCounter(fiber, 9, { min: 0, max: 10, step: 3 }).result[0]).toBe(0);
    });

    it('reset() restores the initial value', () => {
        const { fiber, result } = renderCounter(undefined, 7, { step: 2 });
        const [, actions] = result;

        actions.increment();
        expect(renderCounter(fiber, 7, { step: 2 }).result[0]).toBe(9);

        renderCounter(fiber, 7, { step: 2 }).result[1].reset();
        expect(renderCounter(fiber, 7, { step: 2 }).result[0]).toBe(7);
    });
});
