// ─────────────────────────────────────────────────────
// @termuijs/jsx — useFocusWithin
//
// Hook that reports whether focus currently lies on
// any element in a given list of IDs.
// ─────────────────────────────────────────────────────

import { useContext } from '../context.js';
import { FocusContext } from '../focus-context.js';

export interface UseFocusWithinOptions {
    /** List of focusable element IDs to check against */
    ids: string[];
}

/**
 * useFocusWithin — check if focus is within a list of IDs.
 */
export function useFocusWithin(opts: UseFocusWithinOptions): boolean {
    const ctx = useContext(FocusContext);
    const focusedId = ctx?.focused;
    if (!focusedId) {
        return false;
    }
    return opts?.ids?.includes(focusedId) ?? false;
}


