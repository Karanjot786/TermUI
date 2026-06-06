// ─────────────────────────────────────────────────────
// @termuijs/jsx — useDebounce hook
// ─────────────────────────────────────────────────────
import { useState, useEffect, useRef } from '../hooks.js';

/**
 * useDebounce — debounce a changing value.
 *
 * Returns the last stable value after delayMs ms of no new input.
 *
 * ```tsx
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * ```
 */
export function useDebounce<T>(value: T, delayMs: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setDebouncedValue(value);
            timerRef.current = null;
        }, delayMs);

        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [value, delayMs]);

    return debouncedValue;
}
