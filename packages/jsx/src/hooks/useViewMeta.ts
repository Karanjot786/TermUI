// ─────────────────────────────────────────────────────
// @termuijs/jsx — useViewMeta
//
// Declarative hook to set the terminal window title,
// cursor shape, and mouse tracking mode using ANSI
// escape sequences. Restores defaults on unmount.
// ─────────────────────────────────────────────────────

import { useEffect, useRef } from '../hooks.js';

export interface ViewMeta {
    /** Sets the terminal window title via the ESC]0;title BEL escape sequence */
    title?: string;
    /** Sets the cursor shape via ESC[N q (block, underline, or bar) */
    cursor?: 'block' | 'underline' | 'bar';
    /** Mouse tracking mode */
    mouseMode?: 'none' | 'click' | 'drag';
}

/**
 * useViewMeta — declarative terminal view configuration.
 *
 * ```tsx
 * function App() {
 *     useViewMeta({ title: 'My App', cursor: 'bar', mouseMode: 'click' });
 *     return <Box>Hello World</Box>;
 * }
 * ```
 */
export function useViewMeta(options: ViewMeta): void {
    // Refs to keep track of previously applied settings to avoid redundant writes
    const prevTitle = useRef<string | undefined>(undefined);
    const prevCursor = useRef<'block' | 'underline' | 'bar' | undefined>(undefined);
    const prevMouseMode = useRef<'none' | 'click' | 'drag' | undefined>(undefined);

    useEffect(() => {
        const stdout = process.stdout;
        if (!stdout || typeof stdout.write !== 'function') return;

        // 1. Title: ESC]0;title BEL (\x1b]0;title\x07)
        if (options.title !== undefined && options.title !== prevTitle.current) {
            stdout.write(`\x1b]0;${options.title}\x07`);
            prevTitle.current = options.title;
        }

        // 2. Cursor Shape: ESC[N q
        // block -> 2 (steady block), underline -> 4 (steady underline), bar -> 6 (steady bar)
        if (options.cursor !== undefined && options.cursor !== prevCursor.current) {
            const n = options.cursor === 'block' ? 2 : options.cursor === 'underline' ? 4 : 6;
            stdout.write(`\x1b[${n} q`);
            prevCursor.current = options.cursor;
        }

        // 3. Mouse Mode:
        // none -> disable all mouse tracking (\x1b[?1000l\x1b[?1002l\x1b[?1006l)
        // click -> enable SGR click tracking, disable drag (\x1b[?1002l\x1b[?1000h\x1b[?1006h)
        // drag -> enable SGR button-event tracking, disable click (\x1b[?1000l\x1b[?1002h\x1b[?1006h)
        if (options.mouseMode !== undefined && options.mouseMode !== prevMouseMode.current) {
            if (options.mouseMode === 'click') {
                stdout.write('\x1b[?1002l\x1b[?1000h\x1b[?1006h');
            } else if (options.mouseMode === 'drag') {
                stdout.write('\x1b[?1000l\x1b[?1002h\x1b[?1006h');
            } else if (options.mouseMode === 'none') {
                stdout.write('\x1b[?1000l\x1b[?1002l\x1b[?1006l');
            }
            prevMouseMode.current = options.mouseMode;
        }

        // Cleanup on unmount/dependency change
        return () => {
            // Check if options are changing or if the component is unmounting.
            // If the values are actually changing, the next effect will write the new values,
            // so we don't need to restore defaults. But if the component is unmounting,
            // we must restore defaults.
            // Since we can't directly check unmounting from here without some delay, and useEffect
            // cleanup runs on dependency changes, we restore the defaults for the active features.
            // When options change, the next effect will overwrite the restored default, which is
            // standard and extremely clean.
            if (options.title !== undefined) {
                stdout.write('\x1b]0;\x07');
                prevTitle.current = undefined;
            }
            if (options.cursor !== undefined) {
                stdout.write('\x1b[0 q');
                prevCursor.current = undefined;
            }
            if (options.mouseMode !== undefined) {
                stdout.write('\x1b[?1000l\x1b[?1002l\x1b[?1006l');
                prevMouseMode.current = undefined;
            }
        };
    }, [options.title, options.cursor, options.mouseMode]);
}
