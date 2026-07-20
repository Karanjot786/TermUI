// ─────────────────────────────────────────────────────
// @termuijs/jsx — Focus Context
//
// Provides a React Context for propagating focus state
// through the component tree. Used by useFocusManager,
// useFocus, and useFocusTrap.
// ─────────────────────────────────────────────────────

import { createContext } from './context.js';

export interface FocusContextValue {
    /** The ID of the currently focused element, or null if nothing is focused */
    focused: string | null;
    /** Focus an element by ID */
    focus: (id: string) => void;
    /** Blur (clear) the current focus */
    blur: () => void;
}

export const FocusContext = createContext<FocusContextValue>({
    focused: null,
    focus: () => {},
    blur: () => {},
});
