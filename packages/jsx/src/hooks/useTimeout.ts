// ─────────────────────────────────────────────────────
// @termuijs/jsx — useTimeout hook
// ─────────────────────────────────────────────────────
import { useEffect, useRef } from '../hooks.js';

/**
 * useTimeout — run a callback once after a delay.
 *
 * Auto-cleans up on unmount. Re-runs if callback or delayMs changes.
 *
 * ```tsx
 * useTimeout(() => {
 *   notify('Session expiring soon!')
 * }, 5000)
 * ```
 */
export function useTimeout(callback: () => void, delayMs: number): void {
    const callbackRef = useRef(callback);

    // Always keep ref pointing to latest callback
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const id = setTimeout(() => {
            callbackRef.current();
        }, delayMs);

        return () => {
            clearTimeout(id);
        };
    }, [delayMs]);
}