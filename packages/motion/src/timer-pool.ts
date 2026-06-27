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

// Saved pool callbacks from before clock injection — restored on detach.
const savedSubs = new Map<number, Set<() => void>>();

// Track callbacks registered with the clock via subscribe(delayMs, cb)
// so they can be migrated back to real timers when the clock is detached.
interface ClockSubEntry {
    delayMs: number;
    cb: () => void;
    unsub: () => void;
}
const clockSubs: ClockSubEntry[] = [];

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
        // Save existing pool callbacks before the clock takes over.
        for (const [delay, entry] of pool) {
            clearInterval(entry.id);
            if (!savedSubs.has(delay)) {
                savedSubs.set(delay, new Set());
            }
            for (const cb of entry.subs) {
                savedSubs.get(delay)!.add(cb);
            }
        }
        pool.clear();
        virtualClock = clock;
        return () => {
            if (virtualClock === clock) {
                virtualClock = null;

                // Restore previously saved pool callbacks with real timers.
                for (const [delay, subs] of savedSubs) {
                    for (const cb of subs) {
                        if (!pool.has(delay)) {
                            const newSubs = new Set<() => void>();
                            const id = setInterval(() => {
                                for (const s of newSubs) s();
                            }, delay);
                            pool.set(delay, { id, subs: newSubs });
                        }
                        pool.get(delay)!.subs.add(cb);
                    }
                }
                savedSubs.clear();

                // Migrate clock-registered callbacks back to real timers.
                for (const entry of clockSubs) {
                    entry.unsub();
                    if (!pool.has(entry.delayMs)) {
                        const newSubs = new Set<() => void>();
                        const id = setInterval(() => {
                            for (const s of newSubs) s();
                        }, entry.delayMs);
                        pool.set(entry.delayMs, { id, subs: newSubs });
                    }
                    pool.get(entry.delayMs)!.subs.add(entry.cb);
                }
                clockSubs.length = 0;
            }
        };
    }

    // Overload 1: periodic callback. Route to the clock if one is active.
    if (virtualClock) {
        const delayMs = first as number;
        const cb = second as () => void;
        const unsub = virtualClock._setInterval(delayMs, cb);
        const entry: ClockSubEntry = { delayMs, cb, unsub };
        clockSubs.push(entry);
        return () => {
            unsub();
            const idx = clockSubs.indexOf(entry);
            if (idx !== -1) clockSubs.splice(idx, 1);
        };
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
    // Cancel any clock-registered subscribers
    for (const entry of clockSubs) {
        entry.unsub();
    }
    clockSubs.length = 0;
    savedSubs.clear();
    virtualClock = null;
}
