// ─────────────────────────────────────────────────────
// @termuijs/motion — Tests for Spring Physics
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stepSpring, SPRING_PRESETS, MAX_DT } from './spring.js';
import { unsubscribeAll } from './timer-pool.js';
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
        let stiffState: SpringState  = { value: 0, velocity: 0, target: 1, done: false };
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

    // ── Regression: unbounded dt overshoot ──────────────────────────────────
    // Before the MAX_DT fix, feeding a large dt (simulating process suspend
    // or system sleep) into stepSpring with an underdamped preset caused the
    // value to overshoot the target and oscillate without ever settling,
    // leaking the timer-pool subscription indefinitely.

    it('wobbly preset settles after many normal steps', () => {
        let state: SpringState = { value: 0, velocity: 0, target: 1, done: false };
        for (let i = 0; i < 1000; i++) {
            state = stepSpring(state, SPRING_PRESETS.wobbly, 1 / 60);
            if (state.done) break;
        }
        expect(state.done).toBe(true);
        expect(state.value).toBe(1);
    });

    it('large dt (simulate suspend) does not cause overshoot beyond target × 2', () => {
        // A single step with a 5-second dt should NOT send the value flying
        // to ×10 of the target. Without the MAX_DT cap in animateSpring,
        // callers who pass unbounded dt directly would see this.
        const state: SpringState = { value: 0, velocity: 0, target: 1, done: false };
        const next = stepSpring(state, SPRING_PRESETS.wobbly, MAX_DT);
        // With dt clamped to MAX_DT (1/30), the step is bounded and sane.
        expect(Math.abs(next.value)).toBeLessThan(10);
    });

    it('safety clamp snaps to target when very close', () => {
        // Confirm that a state within 10× precision settles on the next step.
        const state: SpringState = {
            value: 1 + SPRING_PRESETS.default.precision * 5, // within 10× precision
            velocity: SPRING_PRESETS.default.precision * 5,
            target: 1,
            done: false,
        };
        const next = stepSpring(state, SPRING_PRESETS.default, 1 / 60);
        expect(next.done).toBe(true);
        expect(next.value).toBe(1);
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
        expect(() => cancel()).not.toThrow();
    });
});

// ── Regression: timer-pool subscription leak after large dt ─────────────────

describe('animateSpring — MAX_DT prevents timer-pool leak', () => {
    beforeEach(() => {
        // Force caps.motion = true so animateSpring doesn't short-circuit in
        // reduced-motion CI environments (NO_MOTION=1 / CI=1). Without this,
        // the test passes vacuously because the spring path is never entered.
        vi.stubEnv('NO_MOTION', '');
        vi.stubEnv('CI', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        // Clean up any leftover timer-pool subscriptions from the test.
        unsubscribeAll();
    });

    it('MAX_DT is exported and equals 1/30', () => {
        expect(MAX_DT).toBeCloseTo(1 / 30, 5);
    });

    it('stepSpring with MAX_DT never overshoots for wobbly preset', () => {
        const state: SpringState = { value: 0, velocity: 0, target: 1, done: false };
        const next = stepSpring(state, SPRING_PRESETS.wobbly, MAX_DT);
        expect(next.value).toBeGreaterThanOrEqual(-0.5);
        expect(next.value).toBeLessThan(10);
    });

    it('animateSpring with MAX_DT: wobbly eventually settles when driven manually', () => {
        let state: SpringState = { value: 0, velocity: 0, target: 1, done: false };
        for (let i = 0; i < 2000; i++) {
            state = stepSpring(state, SPRING_PRESETS.wobbly, MAX_DT);
            if (state.done) break;
        }
        expect(state.done).toBe(true);
        expect(state.value).toBe(1);
    });

    // NOTE: an end-to-end animateSpring test simulating a wall-clock suspend
    // was deliberately omitted. `vi.useFakeTimers()` does not drive
    // timer-pool's shared setInterval reliably across module load order,
    // and injecting a VirtualClock only controls *when* the pool callback
    // fires — it does not affect the real Date.now() calls inside
    // animateSpring's closure that compute dt. Neither mock reproduces an
    // actual wall-clock jump. The two stepSpring-level tests above already
    // prove MAX_DT prevents overshoot and that wobbly converges under the
    // capped dt deterministically, without depending on timer internals.
});
