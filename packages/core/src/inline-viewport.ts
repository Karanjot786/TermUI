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

// ── Constants ─────────────────────────────────────────

/** ESC[?1049h — switch to alternate screen buffer */
export const ALT_SCREEN_ENTER = '\x1b[?1049h';
/** ESC[?1049l — switch back to main screen buffer */
export const ALT_SCREEN_EXIT  = '\x1b[?1049l';

/**
 * Returns true only for 'alternate' mode.
 * App.mount() uses this to decide whether to call terminal.enterAltScreen().
 * Tests assert this to verify no ESC[?1049h is emitted in 'main' / 'inline'.
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
 * @param terminal  Terminal (or any object with .write(s)).
 * @param screen    Fully-rendered Screen back-buffer.
 * @param rows      How many rows from the bottom to emit. 0 = all rows.
 */
const _inlineHeights = new WeakMap<object, number>();
export function renderInlineToTerminal(
    terminal: Terminal | { write(s: string): void },
    screen: Screen,
    rows: number,
): void {
    const totalRows = screen.rows;
    const start = rows > 0 ? Math.max(0, totalRows - rows) : 0;
    const lines: string[] = [];
    for (let r = start; r < totalRows; r++) {
        const row = (screen as any).back[r];
        if (!row) continue;
        lines.push(row.map((c: any) => c.char || ' ').join(''));
    }
    if (lines.length === 0) return;

    // Move cursor up past the previous block so we overwrite it in-place.
    const prev: number = _inlineHeights.get(screen) ?? 0;    let out = '';
    if (prev > 0) {
        out += `\x1b[${prev}A\r`;
    }

    // Erase and rewrite each line.
    for (let i = 0; i < lines.length; i++) {
        out += '\x1b[2K\r' + lines[i];
        if (i < lines.length - 1) out += '\n';
    }
    // Leave cursor below the block so scrollback is preserved.
    out += '\n';

    (terminal as any).write(out);

    // Track rendered height for next frame's cursor-up.
    _inlineHeights.set(screen, lines.length);
}

// ── createInlineViewport ──────────────────────────────

/**
 * Returns a simple config object (rows).
 * Used by App to validate inlineRows and by tests.
 */
export function createInlineViewport(opts: InlineViewportOptions): { rows: number } {
    return { rows: opts.rows };
}

// ── useInsertBefore hook wire-up ──────────────────────

/**
 * Type for the function injected into the hooks layer via setInsertBefore().
 * App.insertBefore() matches this signature.
 */
export type InsertBeforeFn = (line: string) => (() => void) | void;