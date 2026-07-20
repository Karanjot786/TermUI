// ─────────────────────────────────────────────────────
// @termuijs/jsx — useFocusManager
//
// Provides focus state for a subtree. The returned
// FocusContext and its Provider should be used at the
// root of the component that owns focus management.
//
// Usage:
//   function App() {
//       const { focused, focus, blur, FocusContext } = useFocusManager();
//       return (
//           <FocusContext.Provider value={{ focused, focus, blur }}>
//               <MyForm />
//           </FocusContext.Provider>
//       );
//   }
// ─────────────────────────────────────────────────────

import { useState, useCallback } from '../hooks.js';
import { FocusContext } from '../focus-context.js';
import type { FocusContextValue } from '../focus-context.js';

export interface UseFocusManagerResult extends FocusContextValue {
    /** The FocusContext object — use its Provider to supply focus state to children */
    FocusContext: typeof FocusContext;
}

/**
 * useFocusManager — manages focus state for a subtree.
 *
 * Returns the focus state, control functions, and the FocusContext
 * for use with a Provider.
 *
 * ```tsx
 * function App() {
 *     const { focused, focus, blur, FocusContext } = useFocusManager();
 *     return (
 *         <FocusContext.Provider value={{ focused, focus, blur }}>
 *             <NameInput />
 *             <SubmitButton />
 *         </FocusContext.Provider>
 *     );
 * }
 * ```
 */
export function useFocusManager(): UseFocusManagerResult {
    const [focused, setFocused] = useState<string | null>(null);

    const focus = useCallback((id: string) => setFocused(id), []);
    const blur = useCallback(() => setFocused(null), []);

    return { focused, focus, blur, FocusContext };
}
