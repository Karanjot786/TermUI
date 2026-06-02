// ─────────────────────────────────────────────────────
// Animation Staggering — delayed parallel starts
// ─────────────────────────────────────────────────────

import { subscribe } from './timer-pool.js';
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

function withDelay(runner: AnimationRunner, delayMs: number): AnimationRunner {
    return (done) => {
        if (delayMs <= 0) {
            return runner(done);
        }

        const startTime = Date.now();
        let cancelStarted: (() => void) | null = null;
        let isStarted = false;

        const unsubDelay = subscribe(16, () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < delayMs) return;

            unsubDelay();
            isStarted = true;
            cancelStarted = runner(done);
        });

        return () => {
            unsubDelay();
            if (isStarted) {
                cancelStarted?.();
            }
            cancelStarted = null;
        };
    };
}
