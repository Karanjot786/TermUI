// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useAnimation hook
// ─────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    runEffects,
    destroyFiber,
    type Fiber,
} from '../hooks.js';
import { useAnimation } from './useAnimation.js';
import { animateSpring } from '@termuijs/motion';

vi.mock('@termuijs/motion', async (importActual) => {
    const actual = await importActual<typeof import('@termuijs/motion')>();
    return {
        ...actual,
        // Fully stub out animateSpring so tests assert dep/effect behavior
        // only, without leaking real setInterval timers from timer-pool.
        animateSpring: vi.fn(() => () => {}),
    };
});

const mockAnimateSpring = vi.mocked(animateSpring);

function renderWithFiber<T>(fiber: Fiber, fn: () => T): T {
    setCurrentFiber(fiber);
    const result = fn();
    clearCurrentFiber();
    runEffects(fiber);
    return result;
}

describe('useAnimation', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        mockAnimateSpring.mockClear();
    });

    afterEach(() => {
        destroyFiber(fiber);
        clearCurrentFiber();
    });

    it('does NOT restart the spring when re-rendered with a fresh but equal-valued config object', () => {
        const config = { tension: 200, friction: 20, mass: 1, precision: 0.01 };

        // Initial render establishes currentValue = 0; nothing to animate yet.
        renderWithFiber(fiber, () => useAnimation(0, { config: { ...config } }));
        expect(mockAnimateSpring).toHaveBeenCalledTimes(0);

        // targetValue changes 0 -> 10, so the spring starts.
        renderWithFiber(fiber, () => useAnimation(10, { config: { ...config } }));
        expect(mockAnimateSpring).toHaveBeenCalledTimes(1);

        // Re-render with the SAME targetValue but a brand new object literal
        // carrying identical values. This is the natural call pattern (inline
        // config), and must not re-trigger the effect / restart the spring.
        renderWithFiber(fiber, () => useAnimation(10, { config: { ...config } }));
        renderWithFiber(fiber, () => useAnimation(10, { config: { ...config } }));

        expect(mockAnimateSpring).toHaveBeenCalledTimes(1);
    });

    it('DOES start a new animation when targetValue changes', () => {
        const config = { tension: 200, friction: 20, mass: 1, precision: 0.01 };

        renderWithFiber(fiber, () => useAnimation(0, { config: { ...config } }));
        renderWithFiber(fiber, () => useAnimation(10, { config: { ...config } }));
        expect(mockAnimateSpring).toHaveBeenCalledTimes(1);

        // Same config values (new object), but a different target — the
        // effect must re-fire and kick off a new spring animation.
        renderWithFiber(fiber, () => useAnimation(20, { config: { ...config } }));

        expect(mockAnimateSpring).toHaveBeenCalledTimes(2);
    });
});
