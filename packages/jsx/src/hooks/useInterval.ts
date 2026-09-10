// ─────────────────────────────────────────────────────
// @termuijs/jsx — useInterval hook
// ─────────────────────────────────────────────────────
import { useEffect, useRef } from '../hooks.js';

/**
 * useInterval — declarative interval hook that automatically cleans up on unmount
 * or when delayMs is set to null or undefined.
 *
 * @param callback Callback function executed on every interval tick
 * @param delayMs Interval delay in milliseconds, or null/undefined to pause
 */
export function useInterval(callback: () => void, delayMs: number | null | undefined): void {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delayMs === null || delayMs === undefined) {
            return;
        }

        const id = setInterval(() => {
            savedCallback.current();
        }, delayMs);

        return () => {
            clearInterval(id);
        };
    }, [delayMs]);
}
