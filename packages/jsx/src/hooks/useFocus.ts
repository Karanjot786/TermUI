// ─────────────────────────────────────────────────────
// @termuijs/jsx — useFocus
// ─────────────────────────────────────────────────────

import { useEffect } from '../hooks.js';
import { useContext } from '../context.js';
import { FocusContext } from '../focus-context.js';

export interface UseFocusOptions {
    /** Unique identifier for this focusable element */
    id: string;

    /**
     * When true, this element will auto-focus on mount
     * if nothing else is currently focused.
     */
    autoFocus?: boolean;
}

export interface UseFocusResult {
    /** True when this element is currently focused */
    isFocused: boolean;

    /** Request focus for this element */
    focus: () => void;

    /** Remove focus from entire tree */
    blur: () => void;
}

/**
 * useFocus — consume focus state for a focusable element
 */
export function useFocus({ id, autoFocus }: UseFocusOptions): UseFocusResult {
    const ctx = useContext(FocusContext);

    const isFocused = ctx.focused === id;

    // Extract stable references (important for deps safety)
    const { focused, focus, blur } = ctx;

    useEffect(() => {
        if (autoFocus && focused === null) {
            focus(id);
        }
    }, [autoFocus, focused, focus, id]);

    return {
        isFocused,
        focus: () => focus(id),
        blur: () => blur(),
    };
}
