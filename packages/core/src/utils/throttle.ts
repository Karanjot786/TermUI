// ─────────────────────────────────────────────────────
// @termuijs/core — Throttle utility
// ─────────────────────────────────────────────────────

export interface ThrottleOptions {
    /** Invoke on the leading edge of the timeout */
    leading?: boolean;
    /** Invoke on the trailing edge of the timeout */
    trailing?: boolean;
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds.
 *
 * @param func The function to throttle
 * @param wait The number of milliseconds to throttle invocations to
 * @param options.leading Invoke on the leading edge (default: true)
 * @param options.trailing Invoke on the trailing edge (default: true)
 * @returns The throttled function with a `cancel()` method
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number,
    options: ThrottleOptions = {},
): T & { cancel: () => void } {
    const { leading = true, trailing = true } = options;

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

    function leadingEdge(time: number): ReturnType<T> | undefined {
        lastInvokeTime = time;
        timeoutId = setTimeout(timerExpired, wait);
        return leading ? invokeFunc(time) : undefined;
    }

    function remainingWait(time: number): number {
        const timeSinceLastInvoke = time - lastInvokeTime;
        return wait - timeSinceLastInvoke;
    }

    function shouldInvoke(time: number): boolean {
        const timeSinceLastInvoke = time - lastInvokeTime;

        return (
            lastCallTime === null ||
            timeSinceLastInvoke >= wait ||
            timeSinceLastInvoke < 0
        );
    }

    function trailingEdge(time: number): ReturnType<T> | undefined {
        timeoutId = null;

        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = null;
        return undefined;
    }

    function timerExpired(): void {
        const time = Date.now();
        if (shouldInvoke(time)) {
            trailingEdge(time);
        } else {
            timeoutId = setTimeout(timerExpired, remainingWait(time));
        }
    }

    const throttled = function (this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);

        lastArgs = args;
        lastCallTime = time;

        if (isInvoking) {
            if (timeoutId === null) {
                return leadingEdge(time);
            }
        }

        if (timeoutId === null && trailing) {
            timeoutId = setTimeout(timerExpired, wait);
        }

        return undefined;
    } as T & { cancel: () => void };

    throttled.cancel = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        lastInvokeTime = 0;
        lastArgs = null;
        lastCallTime = null;
        timeoutId = null;
    };

    return throttled;
}
