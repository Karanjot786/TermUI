// ─────────────────────────────────────────────────────
// @termuijs/jsx — useFocusTrap
//
// Traps Tab / Shift+Tab navigation within a group of
// focusable IDs. Intended for Modals and Dialogs that
// should not let focus escape to the background.
//
// Usage:
//   function Modal({ ids }: { ids: string[] }) {
//       useFocusTrap(ids);
//       return <Box>...</Box>;
//   }
// ─────────────────────────────────────────────────────

import { useInput } from '../hooks.js';
import { useContext } from '../context.js';
import { FocusContext } from '../focus-context.js';

/**
 * useFocusTrap — cycle Tab / Shift+Tab focus through a fixed list of IDs.
 *
 * When the currently focused element is in the `ids` array, Tab moves
 * forward through the list (wrapping from last to first) and Shift+Tab
 * moves backward (wrapping from first to last).
 *
 * If no element in the list is focused when Tab is first pressed, focus
 * is placed on the first element.
 *
 * @param ids - Ordered array of focusable element IDs to cycle through.
 *
 * ```tsx
 * function Dialog({ children }: { children: VNode }) {
 *     useFocusTrap(['dialog-ok', 'dialog-cancel']);
 *     return (
 *         <Box>
 *             {children}
 *             <Button id="dialog-ok" />
 *             <Button id="dialog-cancel" />
 *         </Box>
 *     );
 * }
 * ```
 */
export function useFocusTrap(ids: string[]): void {
    const ctx = useContext(FocusContext);

    useInput((key, event) => {
        if (key !== 'tab') return;

        if (ids.length === 0) return;

        const currentIndex = ids.indexOf(ctx.focused ?? '');

        if (event.shift) {
            // Shift+Tab — move backward
            const prev = currentIndex <= 0 ? ids.length - 1 : currentIndex - 1;
            ctx.focus(ids[prev]!);
        } else {
            // Tab — move forward
            const next = currentIndex >= ids.length - 1 ? 0 : currentIndex + 1;
            ctx.focus(ids[next]!);
        }
    });
}
