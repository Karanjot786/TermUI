// ─────────────────────────────────────────────────────
// @termuijs/core — Snapshot tests for terminal rendering
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Screen } from './Screen.js';

function serializeScreen(screen: Screen): string {
    const lines: string[] = [];
    for (let r = 0; r < screen.rows; r++) {
        let line = '';
        for (let c = 0; c < screen.cols; c++) {
            const cell = screen.front[r][c];
            // Only emit the primary cell for wide characters (width > 0)
            if (cell.width > 0) line += cell.char;
        }
        // Remove any explicit null markers used by `invalidate()` and trim trailing spaces
        lines.push(line.replace(/\u0000/g, '').replace(/\s+$/u, ''));
    }
    // Trim trailing empty lines for stable snapshots
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
}

describe('terminal snapshot rendering', () => {
    it('captures a simple ASCII frame', () => {
        const screen = new Screen(40, 6);
        screen.writeString(0, 0, 'Hello, TermUI!');
        screen.writeString(0, 2, 'Line 2 content');
        screen.swap();

        const snapshot = serializeScreen(screen);
        expect(snapshot).toMatchSnapshot();
    });

    it('captures wide/unicode characters consistently', () => {
        const screen = new Screen(20, 4);
        // CJK / emoji wide characters
        screen.writeString(0, 0, '你好，世界 🌍');
        screen.writeString(0, 1, '🏳️‍🌈 multi-codepoint');
        screen.swap();

        const snapshot = serializeScreen(screen);
        expect(snapshot).toMatchSnapshot();
    });
});
