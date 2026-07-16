import type { Middleware, NextMiddleware, SetState } from '../store.js';

export interface ThrottleOptions {
    /** Maximum number of updates allowed per second */
    maxUpdatesPerSecond: number;
}

export interface ThrottleMiddleware<T> extends Middleware<T> {
    /** Clean up the pending timer. Wire into store.destroy() to prevent post-teardown fires. */
    dispose: () => void;
}

/**
 * Throttle middleware.
 * Coalesces rapid state updates to meet the maxUpdatesPerSecond limit.
 *
 * @example
 * const throttled = throttle({ maxUpdatesPerSecond: 10 });
 * const store = createStore(..., { middleware: [throttled] });
 * // On store destroy:
 * store.destroy(); throttled.dispose();
 */
export function throttle<T>(options: ThrottleOptions): ThrottleMiddleware<T> {
    const limitMs = 1000 / options.maxUpdatesPerSecond;
    let lastUpdate = 0;
    let pendingUpdate: Partial<T> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // Typed with SetState<T> — captured on first dispatch so undo/redo can trigger full middleware chain
    let globalSet: SetState<T> | null = null;

    const mw = ((prevState: T, update: Partial<T>, next: NextMiddleware<T>, actionName: string | undefined, abort: () => void, set: SetState<T>) => {
        globalSet = set;
        const now = Date.now();
        const elapsed = now - lastUpdate;

        if (elapsed >= limitMs) {
            lastUpdate = now;
            // `next` returns T | Promise<T>; cast tells TS this is safe as a Middleware return
            return next(update, actionName) as ReturnType<NextMiddleware<T>>;
        }

        // Within the throttle window — coalesce the update
        if (pendingUpdate) {
            Object.assign(pendingUpdate, update);
        } else {
            pendingUpdate = { ...update };
        }

        abort(); // Abort the current synchronous dispatch

        // Schedule the coalesced update only once per throttle window
        if (!timeoutId) {
            timeoutId = setTimeout(() => {
                timeoutId = null;
                if (pendingUpdate && globalSet) {
                    const toApply = pendingUpdate;
                    pendingUpdate = null;
                    globalSet(toApply, `${actionName ?? 'anonymous'}_throttled`);
                }
            }, limitMs - elapsed);
        }

        return false;
    }) as ThrottleMiddleware<T>;

    /** Cancel any pending timer — call this in store.destroy() to avoid post-teardown state mutations. */
    mw.dispose = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        pendingUpdate = null;
        globalSet = null;
    };

    return mw;
}
