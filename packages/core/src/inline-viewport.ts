// Minimal Inline Viewport helper — renders a subset of rows from a Screen
import type { Screen } from './terminal/Screen.js';
import type { Terminal } from './terminal/Terminal.js';

export interface InlineViewportOptions {
    rows: number;
}

/**
 * Render the bottom `rows` of the provided `screen` to the terminal using plain text.
 * Preserves scrollback by writing lines to stdout rather than taking over the alternate screen.
 */
export function renderInlineToTerminal(terminal: Terminal, screen: Screen, rows: number): void {
    const start = Math.max(0, screen.rows - rows);
    const lines: string[] = [];
    for (let r = start; r < screen.rows; r++) {
        const row = screen.back[r];
        if (!row) continue;
        lines.push(row.map(c => c.char || ' ').join(''));
    }
    if (lines.length === 0) return;
    // Debug: log lines to help investigate test failures
    // eslint-disable-next-line no-console
    console.debug('renderInlineToTerminal lines:', lines);
    // Ensure we end with newline to push content into scrollback
    terminal.write(lines.join('\n') + '\n');
}

export function createInlineViewport(opts: InlineViewportOptions) {
    return { rows: opts.rows };
}

export default { renderInlineToTerminal, createInlineViewport };
