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

    it('should accelerate towards the target when below it', () => {
        const current: ScrollSpringState = { position: 0, velocity: 0 };
        const result = calculateSpringScroll(current, 100);
        
        // Should move in positive direction
        expect(result.velocity).toBeGreaterThan(0);
        expect(result.position).toBeGreaterThan(0);
    });

    it('should accelerate towards the target when above it', () => {
        const current: ScrollSpringState = { position: 100, velocity: 0 };
        const result = calculateSpringScroll(current, 0);
        
        // Should move in negative direction
        expect(result.velocity).toBeLessThan(0);
        expect(result.position).toBeLessThan(100);
    });

    it('should dampen velocity when moving fast without displacement force', () => {
        const current: ScrollSpringState = { position: 50, velocity: 100 };
        const result = calculateSpringScroll(current, 50);
        
        // Velocity should be reduced due to damping
        expect(result.velocity).toBeLessThan(100);
        expect(result.velocity).toBeGreaterThan(0);
        // It will slightly overshoot the position since it has velocity
        expect(result.position).toBeGreaterThan(50);
    });

    it('should allow custom dt values', () => {
        const current: ScrollSpringState = { position: 0, velocity: 0 };
        const resultNormal = calculateSpringScroll(current, 100, 1 / 60);
        const resultFast = calculateSpringScroll(current, 100, 1 / 30);
        
        // Larger dt should result in larger position change
        expect(resultFast.position).toBeGreaterThan(resultNormal.position);
    });
});
