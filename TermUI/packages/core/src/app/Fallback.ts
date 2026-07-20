// ─────────────────────────────────────────────────────
// @termuijs/core — Fallback (static) renderer for CI/pipes
// ─────────────────────────────────────────────────────

import type { Screen } from '../terminal/Screen.js';
import { stripAnsi } from '../utils/unicode.js';

/**
 * Detect if the terminal should use fallback (non-interactive) rendering.
 *
 * Returns true when:
 * - stdout is not a TTY (piped)
 * - CI environment variable is set
 * - TERM is 'dumb'
 * - NO_COLOR is set
 */
export function shouldUseFallback(): boolean {
    if (!process.stdout.isTTY) return true;
    if (process.env['CI']) return true;
    if (process.env['TERM'] === 'dumb') return true;
    return false;
}

/**
 * Render a Screen buffer as plain text (no ANSI, no interactivity).
 *
 * Reads all cells from the screen and produces a simple text representation.
 * Strips trailing whitespace from each line and removes empty trailing lines.
 */
export function renderFallback(screen: Screen): string {
    const lines: string[] = [];

    for (let r = 0; r < screen.rows; r++) {
        let line = '';
        for (let c = 0; c < screen.cols; c++) {
            const cell = screen.back[r][c];
            if (cell.width === 0) continue; // Skip continuation cells
            line += cell.char || ' ';
        }
        lines.push(line.trimEnd());
    }

    // Remove empty trailing lines
    while (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }

    return lines.join('\n');
}
