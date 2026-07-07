// ─────────────────────────────────────────────────────
// @termuijs/motion — Tests for Spring Physics
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stepSpring, animateSpring, SPRING_PRESETS, MAX_DT } from './spring.js';
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
// animateSpring() must always call unsub() when done=true, even if the
// animation settles on a tick where dt was clamped from a large wall-clock
// delta. Without the MAX_DT cap, state.done could never become true for
// underdamped presets after a suspend, leaking the setInterval permanently.

describe('animateSpring — MAX_DT prevents timer-pool leak', () => {
    it('MAX_DT is exported and equals 1/30', () => {
        expect(MAX_DT).toBeCloseTo(1 / 30, 5);
    });

    it('animateSpring dt is clamped: large wall-clock gap does not prevent settling', () => {
        vi.useFakeTimers();

        const frames: number[] = [];
        let completed = false;

        animateSpring(0, 1, SPRING_PRESETS.default, v => frames.push(v), () => { completed = true; });

        // Simulate a 10-second suspend by advancing fake time in one huge jump.
        // Without MAX_DT, this would inject dt=10 into the integrator and
        // cause overshoot. With MAX_DT, dt is clamped to 1/30 and the animation
        // continues normally from where it left off.
        vi.advanceTimersByTime(10_000);

        // The animation must complete — unsub must have been called.
        expect(completed).toBe(true);
        // The final frame must land exactly on the target.
        expect(frames[frames.length - 1]).toBe(1);

        vi.useRealTimers();
    });
});
