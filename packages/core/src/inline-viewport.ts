// ─────────────────────────────────────────────────────
// @termuijs/core — Inline viewport & main-screen helpers
// ─────────────────────────────────────────────────────

import type { Screen } from './terminal/Screen.js';
import type { Terminal } from './terminal/Terminal.js';

// ── Types ─────────────────────────────────────────────

export type ScreenMode = 'alternate' | 'main' | 'inline';

export interface InlineViewportOptions {
    rows: number;
}

export type InsertBeforeFn = (line: string) => (() => void) | void;

// ── Constants ─────────────────────────────────────────

/** ESC[?1049h — switch to alternate screen buffer */
export const ALT_SCREEN_ENTER = '\x1b[?1049h';
/** ESC[?1049l — switch back to main screen buffer */
export const ALT_SCREEN_EXIT  = '\x1b[?1049l';

/**
 * Returns true only for 'alternate' mode.
 * App.mount() uses this to decide whether to call terminal.enterAltScreen().
 */
export function usesAlternateScreen(mode: ScreenMode): boolean {
    return mode === 'alternate';
}

// ── renderInlineToTerminal ────────────────────────────

/**
 * Render the bottom `rows` of `screen` to the terminal as plain text.
 *
 * Preserves scrollback — never emits ESC[?1049h.
 * On subsequent calls it moves the cursor up to overwrite the previous block.
 *
 * @param terminal  Any object with a .write(s: string) method.
 * @param screen    Fully-rendered Screen back-buffer.
 * @param rows      How many rows from the bottom to emit. 0 = all rows.
 */
export function renderInlineToTerminal(
    terminal: { write(s: string): void },
    screen: Screen,
    rows: number,
): void {
    const totalRows = screen.rows;
    const start = rows > 0 ? Math.max(0, totalRows - rows) : 0;
    const lines: string[] = [];

    for (let r = start; r < totalRows; r++) {
        lines.push(screen.getLine(r));
    }
    if (lines.length === 0) return;

    // Move cursor up past the previous block so we overwrite it in-place.
    const prev = screen.lastRenderedHeight;
    let out = '';
    if (prev > 0) {
        out += `\x1b[${prev}A\r`;
    }

    for (let i = 0; i < lines.length; i++) {
        out += '\x1b[2K\r' + lines[i];
        if (i < lines.length - 1) out += '\n';
    }
    // Leave cursor below the block so scrollback is preserved.
    out += '\n';

    terminal.write(out);

    // Track rendered height for next frame's cursor-up.
    screen.lastRenderedHeight = lines.length;
}

// ── createInlineViewport ──────────────────────────────

export function createInlineViewport(opts: InlineViewportOptions): { rows: number } {
    return { rows: opts.rows };
}