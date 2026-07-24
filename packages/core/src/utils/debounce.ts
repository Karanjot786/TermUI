// ─────────────────────────────────────────────────────
// @termuijs/core — Debounce utility
// ─────────────────────────────────────────────────────

export interface DebounceOptions {
    /** Invoke on the leading edge of the timeout */
    leading?: boolean;
}

/**
 * Creates a debounced function that delays invoking `func` until after
 * `wait` milliseconds have elapsed since the last time it was invoked.
 *
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @param options.leading Invoke on the leading edge (default: false — trailing)
 * @returns The debounced function with `cancel()` and `flush()` methods
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
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number,
    options?: DebounceOptions,
): T & { cancel: () => void; flush: () => void } {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastArgs: Parameters<T> | undefined;

    const debounced = function (...args: Parameters<T>) {
        lastArgs = args;
        if (options?.leading && !timer) func(...args);
        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            if (!options?.leading) func(...(lastArgs as Parameters<T>));
            lastArgs = undefined;
        }, wait);
    } as T & { cancel: () => void; flush: () => void };

    debounced.cancel = () => {
        clearTimeout(timer);
        timer = undefined;
        lastArgs = undefined;
    };

    debounced.flush = () => {
        if (timer) {
            clearTimeout(timer);
            timer = undefined;
            if (!options?.leading && lastArgs) {
                func(...lastArgs);
            }
            lastArgs = undefined;
        }
    };

    return debounced;
}
