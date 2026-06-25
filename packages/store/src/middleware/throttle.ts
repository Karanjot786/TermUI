import type { Middleware } from '../store.js';

export interface ThrottleOptions {
    /** Maximum number of updates allowed per second */
    maxUpdatesPerSecond: number;
}

/**
 * Throttle middleware.
 * Coalesces rapid state updates to meet the maxUpdatesPerSecond limit.
 */
export function throttle<T>(options: ThrottleOptions): Middleware<T> {
    const limitMs = 1000 / options.maxUpdatesPerSecond;
    let lastUpdate = 0;
    let pendingUpdate: Partial<T> | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let globalSet: any = null;

    return (prevState, update, next, actionName, abort, set) => {
        globalSet = set;
        const now = Date.now();
        const elapsed = now - lastUpdate;

        if (elapsed >= limitMs) {
            lastUpdate = now;
            return next(update, actionName) as any;
        }

        // We are within the throttle window, coalesce the update
        if (pendingUpdate) {
            Object.assign(pendingUpdate, update);
        } else {
            pendingUpdate = { ...update };
        }

        abort(); // Abort the current synchronous dispatch

        // Schedule the coalesced update
        if (!timeoutId) {
            timeoutId = setTimeout(() => {
                timeoutId = null;
                if (pendingUpdate && globalSet) {
                    const toApply = pendingUpdate;
                    pendingUpdate = null;
                    // Fire the delayed update via globalSet so it runs through all middleware
                    globalSet(toApply, `${actionName ?? 'anonymous'}_throttled`);
                }
            }, limitMs - elapsed);
        }

        return false;
    };
}
