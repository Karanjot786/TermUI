// ─────────────────────────────────────────────────────
// Spring Physics — smooth value transitions
// ─────────────────────────────────────────────────────

import { prefersReducedMotion } from '@termuijs/core';
import { subscribe } from './timer-pool.js';

export interface SpringConfig {
    /** Stiffness (default: 170) */
    tension: number;
    /** Damping (default: 26) */
    friction: number;
    /** Mass (default: 1) */
    mass: number;
    /** Velocity threshold for resting (default: 0.01) */
    precision: number;
}

export type SpringPresetName =
    | 'default'
    | 'gentle'
    | 'wobbly'
    | 'stiff'
    | 'slow'
    | 'molasses';

export const SPRING_PRESETS: Record<SpringPresetName, SpringConfig> = {
    default:  { tension: 170, friction: 26,  mass: 1, precision: 0.01 },
    gentle:   { tension: 120, friction: 14,  mass: 1, precision: 0.01 },
    wobbly:   { tension: 180, friction: 12,  mass: 1, precision: 0.01 },
    stiff:    { tension: 210, friction: 20,  mass: 1, precision: 0.01 },
    slow:     { tension: 280, friction: 60,  mass: 1, precision: 0.01 },
    molasses: { tension: 280, friction: 120, mass: 1, precision: 0.01 },
};

export function springPreset(name: SpringPresetName): SpringConfig {
    return {
        ...(SPRING_PRESETS[name] ?? SPRING_PRESETS.default),
    };
}

export interface SpringState {
    value: number;
    velocity: number;
    target: number;
    done: boolean;
}

/**
 * Maximum physics step size (seconds).
 *
 * Caps the wall-clock delta passed to stepSpring so that process suspend,
 * tab backgrounding, or system sleep cannot inject an arbitrarily large dt
 * that causes the spring to overshoot and oscillate indefinitely.
 *
 * At 1/30 s (one 30 fps frame) the spring simulation remains stable for
 * all built-in presets. Larger deltas are silently clamped — the animation
 * skips visual frames but the physics stay convergent.
 */
export const MAX_DT = 1 / 30;

/**
 * Spring simulation — advances physics by one time step.
 * Uses a semi-implicit Euler integration.
 *
 * The caller is responsible for clamping `dt` to `MAX_DT` before calling
 * this function. Passing unbounded wall-clock deltas can cause overshoot
 * and infinite oscillation with underdamped presets (e.g. `wobbly`).
 */
export function stepSpring(state: SpringState, config: SpringConfig, dt: number): SpringState {
    const { tension, friction, mass, precision } = config;

    // Hooke's law: F = -k * x  where x = displacement from target
    const displacement = state.value - state.target;
    const springForce  = -tension * displacement;
    const dampingForce = -friction * state.velocity;
    const acceleration = (springForce + dampingForce) / mass;

    const newVelocity = state.velocity + acceleration * dt;
    const newValue    = state.value    + newVelocity  * dt;

    // Primary settling check
    const done =
        Math.abs(newVelocity) < precision &&
        Math.abs(newValue - state.target) < precision;

    // Safety clamp: snap to target when the *incoming* state (before this
    // integration step) is already within 10x precision on both displacement
    // and velocity. Gating entirely on pre-step values avoids the case where
    // one integration step's acceleration term pushes newVelocity back out
    // past the threshold even though the state was essentially settled —
    // that inconsistency was the root cause of a prior regression.
    if (!done &&
        Math.abs(displacement) < precision * 10 &&
        Math.abs(state.velocity) < precision * 10) {
        return { value: state.target, velocity: 0, target: state.target, done: true };
    }

    return {
        value:    done ? state.target : newValue,
        velocity: done ? 0            : newVelocity,
        target:   state.target,
        done,
    };
}

/**
 * Animate a spring to completion, calling callback on each frame.
 * Returns a cleanup function to cancel the animation.
 *
 * Wall-clock dt is clamped to `MAX_DT` so that process suspend or system
 * sleep cannot cause the spring to overshoot and leak the timer-pool
 * subscription indefinitely.
 */
export function animateSpring(
    from: number,
    to: number,
    config: Partial<SpringConfig> | SpringPresetName,
    onFrame: (value: number) => void,
    onComplete?: () => void,
): () => void {
    if (prefersReducedMotion()) {
        onFrame(to);
        onComplete?.();
        return () => {};
    }

    const resolvedConfig =
        typeof config === 'string'
            ? springPreset(config)
            : config;

    const cfg = {
        ...SPRING_PRESETS.default,
        ...resolvedConfig,
    };

    let state: SpringState = { value: from, velocity: 0, target: to, done: false };
    let lastTime = Date.now();

    const unsub = subscribe(16, () => {
        const now = Date.now();
        // Clamp to MAX_DT — prevents large deltas from process suspend or
        // system sleep injecting unbounded kinetic energy into the integrator.
        const dt = Math.min((now - lastTime) / 1000, MAX_DT);
        lastTime = now;
        state = stepSpring(state, cfg, dt);
        onFrame(state.value);
        if (state.done) {
            unsub();
            onComplete?.();
        }
    });

    return () => unsub();
}
