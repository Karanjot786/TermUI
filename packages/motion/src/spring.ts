// ─────────────────────────────────────────────────────
// Spring Physics — smooth value transitions
// ─────────────────────────────────────────────────────

import { caps } from '@termuijs/core';
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
    default: { tension: 170, friction: 26, mass: 1, precision: 0.01 },
    gentle: { tension: 120, friction: 14, mass: 1, precision: 0.01 },
    wobbly: { tension: 180, friction: 12, mass: 1, precision: 0.01 },
    stiff: { tension: 210, friction: 20, mass: 1, precision: 0.01 },
    slow: { tension: 280, friction: 60, mass: 1, precision: 0.01 },
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
 * Spring simulation — advances physics by one time step.
 * Uses a semi-implicit Euler integration.
 */
export function stepSpring(state: SpringState, config: SpringConfig, dt: number): SpringState {
    const { tension, friction, mass, precision } = config;

    // Hooke's law: F = -k * x  where x = displacement from target
    const displacement = state.value - state.target;
    const springForce = -tension * displacement;
    const dampingForce = -friction * state.velocity;
    const acceleration = (springForce + dampingForce) / mass;

    const newVelocity = state.velocity + acceleration * dt;
    const newValue = state.value + newVelocity * dt;

    // Check if spring has settled
    const done = Math.abs(newVelocity) < precision && Math.abs(newValue - state.target) < precision;

    return {
        value: done ? state.target : newValue,
        velocity: done ? 0 : newVelocity,
        target: state.target,
        done,
    };
}

/**
 * Animate a spring to completion, calling callback on each frame.
 * Returns a cleanup function to cancel the animation.
 */
export function animateSpring(
    from: number,
    to: number,
    config: Partial<SpringConfig> | SpringPresetName,
    onFrame: (value: number) => void,
    onComplete?: () => void,
): () => void {
    if (!caps.motion) {
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
        const dt = (now - lastTime) / 1000; // Use wall-clock time for accurate physics
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
