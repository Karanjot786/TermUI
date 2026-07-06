// ─────────────────────────────────────────────────────
// @termuijs/core — Throttle utility
// ─────────────────────────────────────────────────────

export interface ThrottleOptions {
    /** Invoke on the leading edge of the timeout (default: true) */
    leading?: boolean;
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds.
 *
 * Leading edge fires immediately; a trailing call fires after `wait` ms
 * only if additional calls were made during the interval.
 *
 * @param func The function to throttle
 * @param wait The number of milliseconds to throttle invocations to
 * @param options.leading Invoke on the leading edge (default: true)
 * @returns The throttled function with a `cancel()` method
 */
export function throttle<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number,
    options?: ThrottleOptions,
): T & { cancel: () => void } {
    const leading = options?.leading ?? true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastArgs: Parameters<T> | undefined;

    const throttled = function (...args: Parameters<T>) {
        lastArgs = args;
        if (!timer) {
            if (leading) func(...args);
            timer = setTimeout(() => {
                timer = undefined;
                if (lastArgs !== args || !leading) func(...lastArgs!);
                lastArgs = undefined;
            }, wait);
        }
    } as T & { cancel: () => void };

    throttled.cancel = () => {
        clearTimeout(timer);
        timer = undefined;
        lastArgs = undefined;
    };

    return throttled;
}
