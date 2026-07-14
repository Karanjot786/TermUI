import { describe, it, expect } from 'vitest';
import { calculateSpringScroll, type ScrollSpringState } from './scroll.js';

describe('calculateSpringScroll', () => {
    it('should return unchanged state when position is already at target and velocity is zero', () => {
        const state: ScrollSpringState = { position: 10, velocity: 0 };
        const result = calculateSpringScroll(state, 10, 1 / 60);
        expect(result.position).toBeCloseTo(10, 4);
        expect(result.velocity).toBeCloseTo(0, 4);
    });

    it('should move position closer to target over time when there is a displacement', () => {
        let state: ScrollSpringState = { position: 100, velocity: 0 };
        const target = 0;
        const dt = 1 / 60;

        // Step 1
        state = calculateSpringScroll(state, target, dt);
        expect(state.position).toBeLessThan(100);
        expect(state.velocity).toBeLessThan(0); // moving left/downwards towards 0

        // Simulate multiple steps to confirm convergence towards target
        for (let i = 0; i < 2000; i++) {
            state = calculateSpringScroll(state, target, dt);
        }

        expect(state.position).toBeCloseTo(0, 1);
        expect(state.velocity).toBeCloseTo(0, 1);
    });

    it('should use default dt of 1/60 when dt is not provided', () => {
        const state: ScrollSpringState = { position: 10, velocity: 5 };
        const resultWithDefault = calculateSpringScroll(state, 0);
        const resultWithExplicit = calculateSpringScroll(state, 0, 1 / 60);
        expect(resultWithDefault).toEqual(resultWithExplicit);
    });
});
