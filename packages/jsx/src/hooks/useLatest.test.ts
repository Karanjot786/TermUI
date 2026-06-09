import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
} from '../hooks.js';
import { useLatest } from './useLatest';

describe('useLatest', () => {
    let fiber = createFiber();

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('returns a ref with the initial value', () => {
        const ref = useLatest('initial');

        expect(ref.current).toBe('initial');
    });

    it('updates current on subsequent renders', () => {
        useLatest('initial');

        fiber.hookIndex = 0;

        const ref = useLatest('updated');

        expect(ref.current).toBe('updated');
    });

    it('preserves ref identity across renders', () => {
        const first = useLatest('initial');

        fiber.hookIndex = 0;

        const second = useLatest('updated');

        expect(first).toBe(second);
    });

    it('works with any value type', () => {
        const value = { count: 1 };

        const ref = useLatest(value);

        expect(ref.current).toBe(value);
    });
});
