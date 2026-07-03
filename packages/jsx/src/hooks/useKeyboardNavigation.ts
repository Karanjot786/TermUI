// ─────────────────────────────────────────────────────
// @termuijs/jsx — useKeyboardNavigation
//
// Standard list-style keyboard navigation with arrow
// keys, Home/End, PageUp/PageDown, and Enter to select.
//
// Usage:
//   function Menu({ items }: { items: string[] }) {
//       const { selectedIndex } = useKeyboardNavigation({
//           itemCount: items.length,
//           onSelect: (i) => { /* handle selection */ },
//       });
//       return <List items={items} selectedIndex={selectedIndex} />;
//   }
// ─────────────────────────────────────────────────────

import { useState, useInput } from '../hooks.js';
import { normalizeNavigationKey } from '@termuijs/core';

export interface KeyboardNavigationOptions {
    /** Total number of items in the list */
    itemCount: number;
    /**
     * When true (default), navigation wraps from last item back to first
     * and vice versa. When false, navigation clamps at the boundaries.
     */
    loop?: boolean;
    /**
     * Number of items to skip on PageUp/PageDown (default: 10).
     */
    pageSize?: number;
    /**
     * Called when the user presses Enter on a selected item.
     */
    onSelect?: (index: number) => void;
}

export interface KeyboardNavigationResult {
    /** Index of the currently selected item */
    selectedIndex: number;
    /** Programmatically set the selected index */
    setSelectedIndex: (index: number | ((prev: number) => number)) => void;
}

/**
 * useKeyboardNavigation — arrow-key list navigation with wrap/clamp support.
 *
 * Binds the following keys:
 * - `up` / `down` — move selection by 1
 * - `home` — jump to first item
 * - `end` — jump to last item
 * - `pageup` / `pagedown` — move by `pageSize` items (default 10)
 * - `enter` — call `onSelect` with the current index
 *
 * Key names match the values emitted by `@termuijs/core`'s InputParser.
 *
 * ```tsx
 * function FileList({ files }: { files: string[] }) {
 *     const { selectedIndex } = useKeyboardNavigation({
 *         itemCount: files.length,
 *         loop: false,
 *         onSelect: (i) => openFile(files[i]!),
 *     });
 *     return <List items={files} selectedIndex={selectedIndex} />;
 * }
 * ```
 */
export function useKeyboardNavigation({
    itemCount,
    loop = true,
    pageSize = 10,
    onSelect,
}: KeyboardNavigationOptions): KeyboardNavigationResult {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useInput((key, event) => {
        if (itemCount === 0) return;

        const move = (delta: number) => {
            setSelectedIndex((prev) => {
                const next = prev + delta;
                if (loop) {
                    // Modular wrap — handles large negative deltas correctly
                    return ((next % itemCount) + itemCount) % itemCount;
                }
                return Math.max(0, Math.min(itemCount - 1, next));
            });
        };

        // Build a modifier-aware token when the KeyEvent is available so
        // navigation modes like `emacs` (ctrl+n / ctrl+p) work as expected.
        const token = event
            ? `${event.ctrl ? 'ctrl+' : ''}${event.alt ? 'alt+' : ''}${event.shift ? 'shift+' : ''}${String(event.key).toLowerCase()}`
            : String(key);

        switch (normalizeNavigationKey(token)) {
            case 'up':
                move(-1);
                break;
            case 'down':
                move(1);
                break;
            case 'home':
                setSelectedIndex(0);
                break;
            case 'end':
                setSelectedIndex(itemCount - 1);
                break;
            case 'pageup':
                move(-pageSize);
                break;
            case 'pagedown':
                move(pageSize);
                break;
            case 'enter':
                onSelect?.(selectedIndex);
                break;
        }
    });

    return { selectedIndex, setSelectedIndex };
}
