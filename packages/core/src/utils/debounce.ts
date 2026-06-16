// ─────────────────────────────────────────────────────
// @termuijs/core — Debounce utility
// ─────────────────────────────────────────────────────

export interface DebounceOptions {
    /** Invoke on the leading edge of the timeout */
    leading?: boolean;
    /** Invoke on the trailing edge of the timeout */
    trailing?: boolean;
}

/**
 * Creates a debounced function that delays invoking `func` until after
 * `wait` milliseconds have elapsed since the last time it was invoked.
 *
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @param options.leading Invoke on the leading edge
 * @param options.trailing Invoke on the trailing edge (default: true)
 * @returns The debounced function with a `cancel()` method
 *
 * @example
 * ```ts
 * const search = debounce((query: string) => {
 *   performSearch(query);
 * }, 300);
 *
 * search('term'); // will execute 300ms after last call
 * search.cancel(); // cancel pending execution
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number,
    options: DebounceOptions = {},
): T & { cancel: () => void } {
    const { leading = false, trailing = true } = options;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;
    let lastCallTime: number | null = null;
    let lastInvokeTime = 0;

    function invokeFunc(time: number): ReturnType<T> | undefined {
        const args = lastArgs!;
        lastArgs = null;
        lastInvokeTime = time;
        return func(...args) as ReturnType<T>;
    }

    function shouldInvoke(time: number): boolean {
        const timeSinceLastCall = time - (lastCallTime ?? 0);
        const timeSinceLastInvoke = time - lastInvokeTime;

        return (
            lastCallTime === null ||
            timeSinceLastCall >= wait ||
            timeSinceLastCall < 0 ||
            timeSinceLastInvoke >= wait
        );
    }

    function trailingEdge(): ReturnType<T> | undefined {
        timeoutId = null;
        if (trailing && lastArgs) {
            return invokeFunc(Date.now());
        }
        lastArgs = null;
        return undefined;
    }

    function timerExpired(): void {
        const time = Date.now();
        if (shouldInvoke(time)) {
            trailingEdge();
        } else {
            const timeSinceLastCall = time - (lastCallTime ?? 0);
            const timeWaiting = wait - timeSinceLastCall;
            timeoutId = setTimeout(timerExpired, timeWaiting);
        }
    }

    const debounced = function (this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);

        lastArgs = args;
        lastCallTime = time;

        if (isInvoking) {
            if (timeoutId === null) {
                if (leading) {
                    return invokeFunc(time);
                }
                timeoutId = setTimeout(timerExpired, wait);
            } else {
                clearTimeout(timeoutId!);
                timeoutId = setTimeout(timerExpired, wait);
            }
        } else if (timeoutId === null && trailing) {
            timeoutId = setTimeout(timerExpired, wait);
        }

        return undefined;
    } as T & { cancel: () => void };

    debounced.cancel = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        lastInvokeTime = 0;
        lastArgs = null;
        lastCallTime = null;
        timeoutId = null;
    };

    return debounced;
}