// ─────────────────────────────────────────────────────
// @termuijs/jsx — useFocus
//
// Consumer hook for the FocusContext. Each focusable
// element calls useFocus({ id }) to know whether it is
// currently focused and to get focus/blur controls.
//
// Usage:
//   function TextInput({ id }: { id: string }) {
//       const { isFocused, focus } = useFocus({ id });
//       return <Box borderColor={isFocused ? 'blue' : 'gray'} />;
//   }
// ─────────────────────────────────────────────────────

import { useEffect } from '../hooks.js';
import { useContext } from '../context.js';
import { FocusContext } from '../focus-context.js';

export interface UseFocusOptions {
    /** Unique identifier for this focusable element */
    id: string;
    /**
     * When true, this element will automatically receive focus on mount
     * if nothing else is currently focused.
     */
    autoFocus?: boolean;
}

export interface UseFocusResult {
    /** True when this element is the currently focused element */
    isFocused: boolean;
    /** Request focus for this element */
    focus: () => void;
    /** Remove focus from this element (blur the entire tree) */
    blur: () => void;
}

/**
 * useFocus — consume focus state for a focusable element.
 *
 * ```tsx
 * function Button({ id, label }: { id: string; label: string }) {
 *     const { isFocused, focus } = useFocus({ id, autoFocus: true });
 *     return (
 *         <Box borderColor={isFocused ? 'blue' : 'gray'} onClick={focus}>
 *             <Text>{label}</Text>
 *         </Box>
 *     );
 * }
 * ```
 */
export function useFocus({ id, autoFocus }: UseFocusOptions): UseFocusResult {
    const ctx = useContext(FocusContext);
    const isFocused = ctx.focused === id;

    // Auto-focus on mount if nothing is currently focused
    useEffect(() => {
        if (autoFocus && ctx.focused === null) {
            ctx.focus(id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        isFocused,
        focus: () => ctx.focus(id),
        blur: () => ctx.blur(),
    };
}
