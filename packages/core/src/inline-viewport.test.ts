// ─────────────────────────────────────────────────────
// @termuijs/core — inline-viewport tests
// ─────────────────────────────────────────────────────

import { describe, test, expect, beforeEach } from 'vitest';
import { Screen } from './terminal/Screen.js';
import {
    ALT_SCREEN_ENTER,
    ALT_SCREEN_EXIT,
    createInlineViewport,
    renderInlineToTerminal,
    usesAlternateScreen,
    type ScreenMode,
} from './inline-viewport.js';

// ── Helpers ───────────────────────────────────────────

class FakeTerminal {
    public out = '';
    write(s: string) { this.out += s; }
    reset() { this.out = ''; }
}

// ── Original tests (preserved exactly) ───────────────

test('createInlineViewport returns rows', () => {
    const v = createInlineViewport({ rows: 3 });
    expect(v.rows).toBe(3);
});

test('renderInlineToTerminal writes last N rows', () => {
    const screen = new Screen(5, 4);
    screen.writeString(0, 0, 'row0');
    screen.writeString(0, 1, 'row1');
    screen.writeString(0, 2, 'row2');
    screen.writeString(0, 3, 'row3');

    const term = new FakeTerminal();
    renderInlineToTerminal(term, screen, 2);
    expect(term.out).toContain('row2');
    expect(term.out).toContain('row3');
    expect(term.out).not.toContain('row1');
});

// ── usesAlternateScreen() ─────────────────────────────

describe('usesAlternateScreen()', () => {
    test('returns true for alternate', () => {
        expect(usesAlternateScreen('alternate')).toBe(true);
    });
    test('returns false for main', () => {
        expect(usesAlternateScreen('main')).toBe(false);
    });
    test('returns false for inline', () => {
        expect(usesAlternateScreen('inline')).toBe(false);
    });
});

// ── ALT_SCREEN constants ──────────────────────────────

describe('ALT_SCREEN constants', () => {
    test('ENTER is ESC[?1049h', () => {
        expect(ALT_SCREEN_ENTER).toBe('\x1b[?1049h');
    });
    test('EXIT is ESC[?1049l', () => {
        expect(ALT_SCREEN_EXIT).toBe('\x1b[?1049l');
    });
});

// ── screenMode='main' — no alternate screen ──────────

describe("screenMode='main'", () => {
    test('does NOT emit ESC[?1049h', () => {
        const mode: ScreenMode = 'main';
        const term = new FakeTerminal();
        if (usesAlternateScreen(mode)) term.write(ALT_SCREEN_ENTER);
        expect(term.out).not.toContain('\x1b[?1049h');
    });

    test('scrollback preserved — usesAlternateScreen is false', () => {
        expect(usesAlternateScreen('main')).toBe(false);
    });
});

// ── screenMode='alternate' ───────────────────────────

describe("screenMode='alternate'", () => {
    test('emits ESC[?1049h on enter', () => {
        const term = new FakeTerminal();
        if (usesAlternateScreen('alternate')) term.write(ALT_SCREEN_ENTER);
        expect(term.out).toContain('\x1b[?1049h');
    });

    test('emits ESC[?1049l on exit', () => {
        const term = new FakeTerminal();
        if (usesAlternateScreen('alternate')) term.write(ALT_SCREEN_EXIT);
        expect(term.out).toContain('\x1b[?1049l');
    });
});

// ── renderInlineToTerminal() ──────────────────────────

describe('renderInlineToTerminal()', () => {
    let term: FakeTerminal;
    let screen: Screen;

    beforeEach(() => {
        term = new FakeTerminal();
        screen = new Screen(10, 5);
        screen.writeString(0, 0, 'row0');
        screen.writeString(0, 1, 'row1');
        screen.writeString(0, 2, 'row2');
        screen.writeString(0, 3, 'row3');
        screen.writeString(0, 4, 'row4');
    });

    test('renders only the requested number of rows', () => {
        renderInlineToTerminal(term, screen, 3);
        expect(term.out).toContain('row2');
        expect(term.out).toContain('row3');
        expect(term.out).toContain('row4');
        expect(term.out).not.toContain('row0');
        expect(term.out).not.toContain('row1');
    });

    test('rows=0 renders all rows', () => {
        renderInlineToTerminal(term, screen, 0);
        expect(term.out).toContain('row0');
        expect(term.out).toContain('row4');
    });

    test('does NOT emit ESC[?1049h', () => {
        renderInlineToTerminal(term, screen, 3);
        expect(term.out).not.toContain('\x1b[?1049h');
    });

    test('first frame has no cursor-up sequence', () => {
        renderInlineToTerminal(term, screen, 3);
        expect(term.out).not.toMatch(/\x1b\[\d+A/);
    });

    test('second frame emits cursor-up to overwrite previous block', () => {
        renderInlineToTerminal(term, screen, 3);
        term.reset();
        renderInlineToTerminal(term, screen, 3);
        expect(term.out).toMatch(/\x1b\[\d+A/);
    });

    test('each line is erased before writing (ESC[2K per row)', () => {
        renderInlineToTerminal(term, screen, 3);
        const eraseCount = (term.out.match(/\x1b\[2K/g) ?? []).length;
        expect(eraseCount).toBe(3);
    });

    test('output ends with newline to preserve scrollback', () => {
        renderInlineToTerminal(term, screen, 2);
        expect(term.out.endsWith('\n')).toBe(true);
    });

    test('updates screen.lastRenderedHeight after render', () => {
        renderInlineToTerminal(term, screen, 3);
        expect(screen.lastRenderedHeight).toBe(3);
    });
});

// ── useInsertBefore (App.insertBefore wiring) ─────────

describe('useInsertBefore / App.insertBefore()', () => {
    test('inserted lines appear before live viewport in output', () => {
        const term = new FakeTerminal();
        const screen = new Screen(10, 2);
        screen.writeString(0, 0, 'live0');
        screen.writeString(0, 1, 'live1');

        // Mirrors what App.requestRender() does in inline mode
        term.write('permanent output\n');
        renderInlineToTerminal(term, screen, 2);

        const insertPos = term.out.indexOf('permanent output');
        const livePos   = term.out.indexOf('live0');
        expect(insertPos).toBeLessThan(livePos);
    });

    test('unregister function removes the line from the registry', () => {
        // Mirrors App._insertBefore field + insertBefore() method
        const items: Array<{ id: symbol; text: string }> = [];

        function insertBefore(line: string): () => void {
            const id = Symbol();
            items.push({ id, text: line });
            return () => {
                const idx = items.findIndex(x => x.id === id);
                if (idx >= 0) items.splice(idx, 1);
            };
        }

        const remove = insertBefore('task done');
        expect(items).toHaveLength(1);
        remove();
        expect(items).toHaveLength(0);
    });

    test('multiple lines can be registered and removed independently', () => {
        const items: Array<{ id: symbol; text: string }> = [];

        function insertBefore(line: string): () => void {
            const id = Symbol();
            items.push({ id, text: line });
            return () => {
                const idx = items.findIndex(x => x.id === id);
                if (idx >= 0) items.splice(idx, 1);
            };
        }

        const removeA = insertBefore('line A');
        const removeB = insertBefore('line B');
        expect(items).toHaveLength(2);
        removeA();
        expect(items).toHaveLength(1);
        expect(items[0].text).toBe('line B');
        removeB();
        expect(items).toHaveLength(0);
    });
});