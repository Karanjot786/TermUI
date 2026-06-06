import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
} from '../hooks.js';
import { useEventCallback } from './useEventCallback.js';

describe('useEventCallback', () => {
    let fiber = createFiber();

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('keeps a stable identity across re-renders', () => {
        const callback1 = useEventCallback(() => 'first');

        fiber.hookIndex = 0;

        const callback2 = useEventCallback(() => 'second');

        expect(callback1).toBe(callback2);
    });

    it('calls the latest callback instead of a stale one', () => {
        useEventCallback(() => 'first');

        fiber.hookIndex = 0;

        const callback = useEventCallback(() => 'second');

        expect(callback()).toBe('second');
    });

    it('passes arguments through unchanged', () => {
        const callback = useEventCallback(
            (a: number, b: number) => a + b,
        );

        expect(callback(2, 3)).toBe(5);
    });

    it('passes return values through unchanged', () => {
        const callback = useEventCallback(
            (name: string) => `Hello ${name}`,
        );

        expect(callback('Srushti')).toBe('Hello Srushti');
    });

    it('works with callbacks of any arity', () => {
        const callback = useEventCallback(
            (a: number, b: number, c: number) => a + b + c,
        );

        expect(callback(1, 2, 3)).toBe(6);
    });
});