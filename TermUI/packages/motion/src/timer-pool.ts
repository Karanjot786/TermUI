// ─────────────────────────────────────────────────────
// @termuijs/motion — Shared Interval Timer Pool
//
// One setInterval per unique delayMs, shared across all
// subscribers. Reduces OS timer pressure when many
// widgets poll at the same interval.
//
// Tests can inject a VirtualClock to drive subscribers
// synchronously. See `virtual-clock.ts`.
// ─────────────────────────────────────────────────────

import type { VirtualClock } from './virtual-clock.js';

const pool = new Map<number, { id: ReturnType<typeof setInterval>; subs: Set<() => void> }>();
let virtualClock: VirtualClock | null = null;

/**
 * Subscribe a callback to a shared interval at `delayMs`.
 * Returns an unsubscribe function. The underlying setInterval
 * is created on the first subscriber and cleared automatically
 * when the last subscriber unsubscribes.
 *
 * Pass a `VirtualClock` instead to drive subscribers from
 * in-memory time. Existing real-time intervals are cleared
 * when a clock is injected. The returned function detaches
 * the clock and re-enables the real timer pool.
 *
 * ```ts
 * const unsub = subscribe(1000, () => console.log('tick'));
 * // later:
 * unsub();
 *
 * // Or, in tests:
 * const clock = createVirtualClock();
 * const restore = subscribe(clock);
 * clock.advance(1000); // fires every due subscriber
 * restore();           // back to real timers
 * ```
 */
export function subscribe(clock: VirtualClock): () => void;
export function subscribe(delayMs: number, cb: () => void): () => void;
export function subscribe(...args: unknown[]): () => void {
    const [first, second] = args;

    // Overload 2: VirtualClock injection.
    if (typeof first === 'object' && first !== null && 'advance' in (first as object)) {
        const clock = first as VirtualClock;
        // Clear any real timers; the clock takes over.
        for (const entry of pool.values()) {
            clearInterval(entry.id);
        }
        pool.clear();
        virtualClock = clock;
        return () => {
            if (virtualClock === clock) {
                virtualClock = null;
            }
        };
    }

    // Overload 1: periodic callback. Route to the clock if one is active.
    if (virtualClock) {
        const delayMs = first as number;
        const cb = second as () => void;
        return virtualClock._setInterval(delayMs, cb);
    }

    // Default: real setInterval.
    const delayMs = first as number;
    const cb = second as () => void;
    if (!pool.has(delayMs)) {
        const subs = new Set<() => void>();
        const id = setInterval(() => {
            for (const s of subs) s();
        }, delayMs);
        pool.set(delayMs, { id, subs });
    }
    pool.get(delayMs)!.subs.add(cb);

    return () => {
        const entry = pool.get(delayMs);
        if (!entry) return;
        entry.subs.delete(cb);
        if (entry.subs.size === 0) {
            clearInterval(entry.id);
            pool.delete(delayMs);
        }
    };
}

/**
 * Drain the entire pool — clears all active intervals, removes all
 * subscribers, and detaches any injected virtual clock. Useful in
 * test teardown to prevent timer leaks between cases.
 */
export function unsubscribeAll(): void {
    for (const entry of pool.values()) {
        clearInterval(entry.id);
    }
    pool.clear();
    virtualClock = null;
}
