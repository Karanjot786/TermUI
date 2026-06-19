// ─────────────────────────────────────────────────────
// Animation Staggering — delayed parallel starts
// ─────────────────────────────────────────────────────

import type { AnimationRunner } from './sequence.js';
import * as sequencing from './sequence.js';

/**
 * Run a list of animations in parallel with a fixed start offset per item.
 * item 0 starts immediately, item 1 after delayMs, item 2 after 2*delayMs, etc.
 * Returns a master cancel function to stop pending and active animations.
 */
export function stagger(animations: AnimationRunner[], delayMs: number, onComplete?: () => void): () => void {
    const normalizedDelayMs = Math.max(0, delayMs);
    const delayedAnimations = animations.map((runner, index) => withDelay(runner, index * normalizedDelayMs));
    return sequencing.parallel(delayedAnimations, onComplete);
}

/**
 * Wraps a runner with a startup delay using `setTimeout`.
 * Note: uses real `setTimeout` (not VirtualClock injection), so delays are not
 * controllable via fake timers in tests. For deterministic stagger timing in tests,
 * call runners directly without stagger().
 */
function withDelay(runner: AnimationRunner, delayMs: number): AnimationRunner {
    return (done) => {
        if (delayMs <= 0) {
            return runner(done);
        }

        let cancelStarted: (() => void) | null = null;
        let isStarted = false;

        const timeoutId = setTimeout(() => {
            isStarted = true;
            cancelStarted = runner(done);
        }, delayMs);

        return () => {
            clearTimeout(timeoutId);
            if (isStarted) {
                cancelStarted?.();
            }
            cancelStarted = null;
        };
    };
}
