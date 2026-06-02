// ─────────────────────────────────────────────────────
// @termuijs/motion — Virtual Clock Interface
//
// A clock abstraction used by tests to advance time
// synchronously without real sleeps. Pairs with the
// shared interval timer pool in `timer-pool.ts`.
// ─────────────────────────────────────────────────────

/**
 * A virtual clock that tracks elapsed milliseconds in
 * software instead of relying on `setInterval`/`setTimeout`.
 *
 * Tests inject an instance into the motion timer pool
 * via `timerPoolSubscribe(clock)`. From that point on,
 * any subscriber added through `timerPoolSubscribe(delayMs, cb)`
 * is driven by the clock instead of real wall-clock time.
 *
 * ```ts
 * import { createVirtualClock } from '@termuijs/testing';
 * import { timerPoolSubscribe } from '@termuijs/motion';
 *
 * const clock = createVirtualClock();
 * timerPoolSubscribe(clock);
 *
 * clock.advance(500); // fires every timer due within 500ms
 * clock.now();        // 500
 * ```
 */
export interface VirtualClock {
    /** Current virtual time in milliseconds since the clock started. */
    now(): number;

    /**
     * Advance virtual time by `ms` milliseconds and fire every
     * periodic and one-shot timer whose deadline falls within the
     * new window. Runs synchronously — no real waiting.
     *
     * Negative values are ignored. A value of `0` fires timers
     * that were already due at the current time.
     */
    advance(ms: number): void;

    /**
     * Advance virtual time by one frame (16ms). Convenience
     * shorthand for animation tests that step frame-by-frame.
     */
    tick(): void;

    /**
     * Register a periodic timer that fires every `delayMs` of
     * virtual time. Returns an unsubscribe function. The timer
     * pool calls this internally once a clock is injected.
     *
     * @internal
     */
    _setInterval(delayMs: number, cb: () => void): () => void;
}
