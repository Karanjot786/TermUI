import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { motionConfig, resetMotionConfig } from '@termuijs/motion';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    runEffects,
    destroyFiber,
    type Fiber,
} from '../hooks.js';
import { useReducedMotion } from './useReducedMotion.js';

describe('useReducedMotion', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
        resetMotionConfig();
    });

    it('reflects the current motionConfig.reducedMotion value on first render', () => {
        motionConfig.setReducedMotion(true);

        const reduced = useReducedMotion();

        expect(reduced).toBe(true);
    });

    it('defaults to false when no override is set (test environment has motion enabled)', () => {
        const reduced = useReducedMotion();

        expect(reduced).toBe(false);
    });

    it('updates when motionConfig.setReducedMotion() changes the value', () => {
        useReducedMotion();
        runEffects(fiber);

        motionConfig.setReducedMotion(true);

        const stateHook = fiber.hooks.find((h: any) => typeof h?.value === 'boolean');
        expect(stateHook?.value).toBe(true);
    });

    it('unsubscribes from motionConfig on unmount', () => {
        useReducedMotion();
        runEffects(fiber);

        destroyFiber(fiber);

        // After destroy, further changes must not throw and must not be
        // observable on the (now-cleared) fiber hooks.
        expect(() => motionConfig.setReducedMotion(true)).not.toThrow();
        expect(fiber.hooks.length).toBe(0);
    });
});
