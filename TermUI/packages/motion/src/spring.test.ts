// ─────────────────────────────────────────────────────
// @termuijs/motion — Tests for Spring Physics
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stepSpring, SPRING_PRESETS } from './spring.js';
import type { SpringState } from './spring.js';

describe('stepSpring', () => {
    it('moves value toward target', () => {
        const initial: SpringState = { value: 0, velocity: 0, target: 100, done: false };
        const next = stepSpring(initial, SPRING_PRESETS.default, 1 / 60);
        expect(next.value).toBeGreaterThan(0);
        expect(next.value).toBeLessThan(100);
    });

    it('settles at target after many steps', () => {
        let state: SpringState = { value: 0, velocity: 0, target: 1, done: false };
        for (let i = 0; i < 500; i++) {
            state = stepSpring(state, SPRING_PRESETS.default, 1 / 60);
            if (state.done) break;
        }
        expect(state.done).toBe(true);
        expect(state.value).toBe(1);
        expect(state.velocity).toBe(0);
    });

    it('already at target marks done immediately', () => {
        const state: SpringState = { value: 5, velocity: 0, target: 5, done: false };
        const next = stepSpring(state, SPRING_PRESETS.default, 1 / 60);
        expect(next.done).toBe(true);
        expect(next.value).toBe(5);
    });

    it('stiff preset settles faster than gentle', () => {
        let stiffState: SpringState = { value: 0, velocity: 0, target: 1, done: false };
        let gentleState: SpringState = { value: 0, velocity: 0, target: 1, done: false };
        let stiffSteps = 0, gentleSteps = 0;

        for (let i = 0; i < 1000; i++) {
            stiffState = stepSpring(stiffState, SPRING_PRESETS.stiff, 1 / 60);
            stiffSteps++;
            if (stiffState.done) break;
        }
        for (let i = 0; i < 1000; i++) {
            gentleState = stepSpring(gentleState, SPRING_PRESETS.gentle, 1 / 60);
            gentleSteps++;
            if (gentleState.done) break;
        }

        expect(stiffSteps).toBeLessThan(gentleSteps);
    });

    it('SPRING_PRESETS has expected keys', () => {
        expect(SPRING_PRESETS).toHaveProperty('default');
        expect(SPRING_PRESETS).toHaveProperty('gentle');
        expect(SPRING_PRESETS).toHaveProperty('wobbly');
        expect(SPRING_PRESETS).toHaveProperty('stiff');
        expect(SPRING_PRESETS).toHaveProperty('slow');
        expect(SPRING_PRESETS).toHaveProperty('molasses');
    });
});

// caps.motion is evaluated at module load time, so each test must:
// 1. vi.stubEnv() to set NO_MOTION
// 2. vi.resetModules() to clear the cached module
// 3. dynamically import() to get a fresh module with the stubbed env

describe('animateSpring — caps.motion=false', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('calls onFrame(to) immediately and synchronously', async () => {
        vi.stubEnv('NO_MOTION', '1');
        vi.stubEnv('CI', '');
        vi.resetModules();
        const { animateSpring } = await import('./spring.js');

        const frames: number[] = [];
        animateSpring(0, 42, {}, v => frames.push(v));

        expect(frames).toEqual([42]);
    });

    it('calls onComplete immediately', async () => {
        vi.stubEnv('NO_MOTION', '1');
        vi.stubEnv('CI', '');
        vi.resetModules();
        const { animateSpring } = await import('./spring.js');

        let completed = false;
        animateSpring(0, 42, {}, () => {}, () => { completed = true; });

        expect(completed).toBe(true);
    });

    it('returns a no-op cancel function', async () => {
        vi.stubEnv('NO_MOTION', '1');
        vi.stubEnv('CI', '');
        vi.resetModules();
        const { animateSpring } = await import('./spring.js');

        const cancel = animateSpring(0, 42, {}, () => {});
        // Should not throw
        expect(() => cancel()).not.toThrow();
    });
});
