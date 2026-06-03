// ─────────────────────────────────────────────────────
// @termuijs/testing — Virtual Clock
//
// A wall-clock-free timer for tests. Tracks elapsed
// milliseconds in software and fires subscribers on
// demand. Pairs with `@termuijs/motion` timer pool so
// animations and intervals can be advanced synchronously.
// ─────────────────────────────────────────────────────

import type { VirtualClock } from '@termuijs/motion';

interface PeriodicTimer {
    delayMs: number;
    lastFiredAt: number;
    cb: () => void;
    cancelled: boolean;
}

/**
 * Create a virtual clock. The returned object exposes
 * `now()`, `advance(ms)`, and `tick()` for test code, plus
 * an internal `_setInterval` used by the motion timer pool.
 *
 * Each clock instance owns its own time and its own queue
 * of periodic timers. Two clocks do not interfere.
 *
 * ```ts
 * import { createVirtualClock } from '@termuijs/testing';
 * import { timerPoolSubscribe, timerPoolUnsubscribeAll } from '@termuijs/motion';
 *
 * const clock = createVirtualClock();
 * timerPoolSubscribe(clock); // drive subscribers from the clock
 *
 * const ticks: number[] = [];
 * timerPoolSubscribe(50, () => ticks.push(clock.now()));
 *
 * clock.advance(200); // synchronously fires the 50ms callback four times
 *
 * timerPoolUnsubscribeAll(); // clean up
 * ```
 */
export function createVirtualClock(): VirtualClock {
    let now = 0;
    const periodics: PeriodicTimer[] = [];

    function _setInterval(delayMs: number, cb: () => void): () => void {
        const timer: PeriodicTimer = {
            delayMs,
            lastFiredAt: now,
            cb,
            cancelled: false,
        };
        periodics.push(timer);
        return () => {
            timer.cancelled = true;
        };
    }

    function advance(ms: number): void {
        if (ms < 0) return;
        const target = now + ms;
        drainAt(target);
        now = target;
    }

    function drainAt(target: number): void {
        // Snapshot existing timers. Callbacks that add new ones
        // do not re-enter this loop in the same advance call;
        // their timers fire on the next advance().
        const snapshot = periodics.slice();

        for (const t of snapshot) {
            if (t.cancelled) continue;
            while (!t.cancelled && target - t.lastFiredAt >= t.delayMs) {
                t.lastFiredAt += t.delayMs;
                // Make `now()` reflect the scheduled fire time so
                // callbacks read a consistent timestamp.
                now = t.lastFiredAt;
                t.cb();
            }
        }

        // Reap cancelled timers so the queue does not grow forever.
        for (let i = periodics.length - 1; i >= 0; i--) {
            if (periodics[i].cancelled) periodics.splice(i, 1);
        }
    }

    function tick(): void {
        advance(16);
    }

    return {
        now: () => now,
        advance,
        tick,
        _setInterval,
    };
}
