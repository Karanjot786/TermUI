// ─────────────────────────────────────────────────────
// Motion Config — global reduced-motion override
// ─────────────────────────────────────────────────────
import { prefersReducedMotion } from '@termuijs/core';

type ReducedMotionListener = (reducedMotion: boolean) => void;

let override: boolean | null = null;
const listeners = new Set<ReducedMotionListener>();

/**
 * Global motion configuration.
 *
 * Animation helpers in this package (e.g. `animateSpring`) read
 * `motionConfig.reducedMotion` instead of calling `prefersReducedMotion()`
 * from `@termuijs/core` directly. This lets an application flip reduced
 * motion on or off at runtime — from a settings screen, a CLI flag parsed
 * after startup, etc. — without requiring the `NO_MOTION` environment
 * variable to be set before the process starts.
 *
 * When no override has been set, `reducedMotion` falls back to the
 * environment-detected default from `@termuijs/core` (`NO_MOTION=1` or
 * `CI=1`).
 *
 * @example
 * ```ts
 * import { motionConfig } from '@termuijs/motion';
 *
 * // Force reduced motion on, regardless of NO_MOTION/CI
 * motionConfig.setReducedMotion(true);
 *
 * // Go back to environment-detected behavior
 * motionConfig.setReducedMotion(null);
 * ```
 */
export const motionConfig = {
    /** Effective reduced-motion state: the override if set, else env detection. */
    get reducedMotion(): boolean {
        return override ?? prefersReducedMotion();
    },

    /**
     * Force reduced motion on (`true`) or off (`false`), overriding the
     * `NO_MOTION`/`CI` environment detection. Pass `null` to clear the
     * override and fall back to environment detection again.
     *
     * Notifies any `subscribe` listeners with the new effective value.
     */
    setReducedMotion(value: boolean | null): void {
        override = value;
        const current = motionConfig.reducedMotion;
        for (const listener of listeners) listener(current);
    },

    /**
     * Subscribe to changes in the effective reduced-motion state.
     * Only fires on `setReducedMotion()` calls, not on environment changes.
     * Returns an unsubscribe function.
     */
    subscribe(listener: ReducedMotionListener): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};

/**
 * Test-only: reset the override and clear all subscribers.
 * Call this in `afterEach` when a test calls `setReducedMotion`.
 */
export function resetMotionConfig(): void {
    override = null;
    listeners.clear();
}
