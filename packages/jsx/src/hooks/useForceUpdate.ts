// ─────────────────────────────────────────────────────
// @termuijs/jsx — useForceUpdate hook
// ─────────────────────────────────────────────────────
import { useState, useCallback } from '../hooks.js';

/**
 * useForceUpdate — returns a stable function that forces the component to re-render.
 *
 * ```tsx
 * const forceUpdate = useForceUpdate();
 * forceUpdate(); // triggers a re-render
 * ```
 */
export function useForceUpdate(): () => void {
    const [, setState] = useState(0);

    return useCallback(() => {
        setState((n) => n + 1);
    }, []);
}
