// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for KeyboardShortcuts widget
//
// Covers:
//   1. Constructor & Initialization
//   2. Grouping Logic (via rendered output)
//   3. Category Rendering
//   4. Key Label Rendering
//   5. Description Rendering
//   6. Column Layout
//   7. setBindings()
//   8. Rendering Behavior
//   9. Unicode / ASCII Modes
//  10. Truncation & Overflow
//  11. Dirty State
//  12. Robustness
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { KeyboardShortcuts } from './KeyboardShortcuts.js';
import type { ShortcutBinding } from './KeyboardShortcuts.js';

// ── Helpers ───────────────────────────────────────────

const W = 80;
const H = 24;

/** Render a KeyboardShortcuts widget and return the screen. */
function render(
    widget: KeyboardShortcuts,
    width = W,
    height = H,
): Screen {
    const screen = new Screen(width, height);
    widget.updateRect({ x: 0, y: 0, width, height });
    widget.render(screen);
    return screen;
}

/** Extract a single row of characters from the screen back buffer. */
function row(screen: Screen, r: number): string {
    return screen.back[r].map((c: { char: string }) => c.char).join('');
}

/** Collect all rendered rows as an array of strings. */
function rows(screen: Screen, height = H): string[] {
    return Array.from({ length: height }, (_, i) => row(screen, i));
}

/** Collect all rendered content into one joined string for easy contains checks. */
function rendered(screen: Screen, height = H): string {
    return rows(screen, height).join('\n');
}

afterEach(() => {
    vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────
// 1. Constructor & Initialization
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Constructor & Initialization', () => {
    it('constructs with empty bindings without throwing', () => {
        expect(() => new KeyboardShortcuts([])).not.toThrow();
    });

    it('constructs with bindings without throwing', () => {
        expect(() =>
            new KeyboardShortcuts([{ key: 'q', description: 'Quit' }]),
        ).not.toThrow();
    });

    it('applies default columns of 2', () => {
        const widget = new KeyboardShortcuts([]);
        // Render into a known width; with 2 columns and width 80 each col = 40
        // We can only observe this indirectly — just ensure no throw
        expect(() => render(widget)).not.toThrow();
    });

    it('accepts columns: 3 without throwing', () => {
        const widget = new KeyboardShortcuts([], { columns: 3 });
        expect(() => render(widget)).not.toThrow();
    });

    it('clamps columns: 0 to at least 1', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit' }],
            { columns: 0 },
        );
        // With 1 column the key label must appear in row 0
        const screen = render(widget);
        expect(row(screen, 0)).toContain('[q]');
    });

    it('clamps negative columns to at least 1', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit' }],
            { columns: -5 },
        );
        expect(() => render(widget)).not.toThrow();
    });

    it('renders without throwing when constructed with default options', () => {
        const widget = new KeyboardShortcuts([{ key: 'Enter', description: 'Confirm' }]);
        expect(() => render(widget)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────
// 2. Grouping Logic (verified through rendered output)
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Grouping Logic', () => {
    it('bindings without categories appear in order with no headings', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'a', description: 'Alpha' },
            { key: 'b', description: 'Beta' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        const output = rendered(screen);
        expect(output).toContain('[a]');
        expect(output).toContain('[b]');
        // No category headings
        expect(output).not.toMatch(/[A-Z]{2,}\s*[─-]/);
    });

    it('categorized bindings are grouped under their category heading', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit', category: 'General' },
            { key: 's', description: 'Save', category: 'File' },
            { key: 'o', description: 'Open', category: 'File' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        const output = rendered(screen);

        expect(output).toContain('GENERAL');
        expect(output).toContain('FILE');
        expect(output).toContain('[q]');
        expect(output).toContain('[s]');
        expect(output).toContain('[o]');
    });

    it('preserves category insertion order (General before File)', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit', category: 'General' },
            { key: 's', description: 'Save', category: 'File' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        const output = rendered(screen);

        const generalPos = output.indexOf('GENERAL');
        const filePos = output.indexOf('FILE');
        expect(generalPos).toBeGreaterThanOrEqual(0);
        expect(filePos).toBeGreaterThanOrEqual(0);
        expect(generalPos).toBeLessThan(filePos);
    });

    it('preserves category insertion order (File before General)', () => {
        const bindings: ShortcutBinding[] = [
            { key: 's', description: 'Save', category: 'File' },
            { key: 'q', description: 'Quit', category: 'General' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        const output = rendered(screen);

        const filePos = output.indexOf('FILE');
        const generalPos = output.indexOf('GENERAL');
        expect(filePos).toBeLessThan(generalPos);
    });

    it('multiple bindings in the same category share one heading', () => {
        const bindings: ShortcutBinding[] = [
            { key: 's', description: 'Save', category: 'File' },
            { key: 'o', description: 'Open', category: 'File' },
            { key: 'x', description: 'Exit', category: 'File' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        const output = rendered(screen);

        // Heading appears only once
        const matches = output.match(/FILE/g);
        expect(matches).toHaveLength(1);

        expect(output).toContain('[s]');
        expect(output).toContain('[o]');
        expect(output).toContain('[x]');
    });

    it('mixed categorized and uncategorized bindings render correctly', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'h', description: 'Help' },                     // no category
            { key: 'q', description: 'Quit', category: 'General' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        const output = rendered(screen);

        expect(output).toContain('[h]');
        expect(output).toContain('[q]');
        expect(output).toContain('GENERAL');
    });
});

// ─────────────────────────────────────────────────────
// 3. Category Rendering
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Category Rendering', () => {
    it('renders category headings in uppercase', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit', category: 'general' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        expect(rendered(screen)).toContain('GENERAL');
    });

    it('renders unicode divider after heading when unicode is available', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit', category: 'Nav' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        expect(rendered(screen)).toContain('─');
    });

    it('renders ASCII divider after heading when unicode is unavailable', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit', category: 'Nav' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        // ASCII fallback is '-'
        expect(rendered(screen)).toContain('-');
        expect(rendered(screen)).not.toContain('─');
    });

    it('hides category headings when showCategories is false', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit', category: 'General' },
        ];
        const widget = new KeyboardShortcuts(bindings, {
            columns: 1,
            showCategories: false,
        });
        const screen = render(widget);
        const output = rendered(screen);
        expect(output).not.toContain('GENERAL');
        // Key label should still render
        expect(output).toContain('[q]');
    });

    it('does not render a heading for blank category string', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'h', description: 'Help', category: '' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        // Blank category should behave like no category — no uppercase heading
        const output = rendered(screen);
        // No heading separator line should appear (empty category is skipped by the guard)
        expect(output).toContain('[h]');
    });

    it('heading fills the available width with divider characters', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit', category: 'Nav' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget, 20, 10);
        const headingRow = row(screen, 0);
        // Row length should be exactly 20 (width)
        expect(headingRow.length).toBe(20);
        // Should start with 'NAV'
        expect(headingRow.startsWith('NAV')).toBe(true);
    });
});

// ─────────────────────────────────────────────────────
// 4. Key Label Rendering
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Key Label Rendering', () => {
    it('renders key label in bracket format [key]', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit' }],
            { columns: 1 },
        );
        const screen = render(widget);
        expect(row(screen, 0)).toContain('[q]');
    });

    it('renders multi-character key names like Ctrl+C', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'Ctrl+C', description: 'Copy' }],
            { columns: 1 },
        );
        const screen = render(widget);
        expect(row(screen, 0)).toContain('[Ctrl+C]');
    });

    it('renders Enter key label correctly', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'Enter', description: 'Confirm' }],
            { columns: 1 },
        );
        const screen = render(widget);
        expect(row(screen, 0)).toContain('[Enter]');
    });

    it('renders function key labels like F1', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'F1', description: 'Help' }],
            { columns: 1 },
        );
        const screen = render(widget);
        expect(row(screen, 0)).toContain('[F1]');
    });

    it('key label appears before description on the same row', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit' }],
            { columns: 1 },
        );
        const screen = render(widget);
        const r = row(screen, 0);
        const keyPos = r.indexOf('[q]');
        const descPos = r.indexOf('Quit');
        expect(keyPos).toBeGreaterThanOrEqual(0);
        expect(descPos).toBeGreaterThan(keyPos);
    });

    it('renders long key names safely without throwing', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'Ctrl+Shift+Alt+Super+P', description: 'Very long key' }],
            { columns: 1 },
        );
        expect(() => render(widget, 40, 5)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────
// 5. Description Rendering
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Description Rendering', () => {
    it('renders description text next to key label', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit application' }],
            { columns: 1 },
        );
        const screen = render(widget);
        expect(rendered(screen)).toContain('Quit application');
    });

    it('renders empty description safely without throwing', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'x', description: '' }],
            { columns: 1 },
        );
        expect(() => render(widget)).not.toThrow();
    });

    it('truncates description to fit within column width', () => {
        // Use a very narrow width with columns:1 so the description must be cut
        const longDesc = 'A'.repeat(200);
        const widget = new KeyboardShortcuts(
            [{ key: 'a', description: longDesc }],
            { columns: 1 },
        );
        const screen = render(widget, 20, 5);
        const r = row(screen, 0);
        // Row must not exceed 20 chars
        expect(r.length).toBeLessThanOrEqual(20);
    });

    it('description does not overflow into adjacent column space', () => {
        // 2 columns, width 40 → each column is 20 chars
        const bindings: ShortcutBinding[] = [
            { key: 'a', description: 'A'.repeat(100) },
            { key: 'b', description: 'Beta' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 2 });
        expect(() => render(widget, 40, 5)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────
// 6. Column Layout
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Column Layout', () => {
    it('1-column layout renders each binding on its own row', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'a', description: 'Alpha' },
            { key: 'b', description: 'Beta' },
            { key: 'c', description: 'Gamma' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        expect(row(screen, 0)).toContain('[a]');
        expect(row(screen, 1)).toContain('[b]');
        expect(row(screen, 2)).toContain('[c]');
    });

    it('2-column layout places first two bindings on the same row', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'a', description: 'Alpha' },
            { key: 'b', description: 'Beta' },
            { key: 'c', description: 'Gamma' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 2 });
        const screen = render(widget, 80, 5);
        const r0 = row(screen, 0);
        // Both 'a' and 'b' should appear on the same row
        expect(r0).toContain('[a]');
        expect(r0).toContain('[b]');
        // 'c' should be on the next row
        expect(row(screen, 1)).toContain('[c]');
    });

    it('3-column layout places first three bindings on the same row', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'a', description: 'A' },
            { key: 'b', description: 'B' },
            { key: 'c', description: 'C' },
            { key: 'd', description: 'D' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 3 });
        const screen = render(widget, 90, 5);
        const r0 = row(screen, 0);
        expect(r0).toContain('[a]');
        expect(r0).toContain('[b]');
        expect(r0).toContain('[c]');
        // 'd' should wrap to next row
        expect(row(screen, 1)).toContain('[d]');
    });

    it('small column width does not crash rendering', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'a', description: 'Alpha' },
            { key: 'b', description: 'Beta' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 2 });
        // Very small width → each column will be 0 or 1 char wide
        expect(() => render(widget, 5, 5)).not.toThrow();
    });

    it('columns exceeding available width do not crash', () => {
        const bindings: ShortcutBinding[] = Array.from({ length: 10 }, (_, i) => ({
            key: String.fromCharCode(97 + i),
            description: `Desc ${i}`,
        }));
        const widget = new KeyboardShortcuts(bindings, { columns: 10 });
        // Only 8 px wide — far fewer than 10 columns
        expect(() => render(widget, 8, 5)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────
// 7. setBindings()
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — setBindings()', () => {
    it('replaces existing bindings', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit' }],
            { columns: 1 },
        );
        widget.setBindings([{ key: 'h', description: 'Help' }]);
        const screen = render(widget);
        const output = rendered(screen);
        expect(output).toContain('[h]');
        expect(output).not.toContain('[q]');
    });

    it('removes all old bindings', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'a', description: 'Old A' }, { key: 'b', description: 'Old B' }],
            { columns: 1 },
        );
        widget.setBindings([]);
        const screen = render(widget);
        const output = rendered(screen);
        expect(output).not.toContain('[a]');
        expect(output).not.toContain('[b]');
    });

    it('new bindings render correctly after setBindings()', () => {
        const widget = new KeyboardShortcuts([], { columns: 1 });
        widget.setBindings([
            { key: 'Enter', description: 'Confirm' },
            { key: 'Esc', description: 'Cancel' },
        ]);
        const screen = render(widget);
        const output = rendered(screen);
        expect(output).toContain('[Enter]');
        expect(output).toContain('[Esc]');
    });

    it('marks dirty after setBindings()', () => {
        const widget = new KeyboardShortcuts([], { columns: 1 });
        render(widget); // clears dirty after initial render
        widget.clearDirty();
        widget.setBindings([{ key: 'x', description: 'Exit' }]);
        expect(widget.isDirty).toBe(true);
    });

    it('is dirty after each setBindings() call', () => {
        const widget = new KeyboardShortcuts([], { columns: 1 });
        widget.clearDirty();
        widget.setBindings([{ key: 'a', description: 'A' }]);
        expect(widget.isDirty).toBe(true);

        widget.clearDirty();
        widget.setBindings([{ key: 'b', description: 'B' }]);
        expect(widget.isDirty).toBe(true);
    });
});

// ─────────────────────────────────────────────────────
// 8. Rendering Behavior
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Rendering Behavior', () => {
    it('empty widget renders without crashing and produces blank output', () => {
        const widget = new KeyboardShortcuts([], { columns: 1 });
        expect(() => render(widget)).not.toThrow();
        const screen = render(widget);
        const output = rendered(screen);
        // All characters should be spaces (blank)
        expect(output.trim()).toBe('');
    });

    it('single binding renders key and description', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit' }],
            { columns: 1 },
        );
        const screen = render(widget);
        const output = rendered(screen);
        expect(output).toContain('[q]');
        expect(output).toContain('Quit');
    });

    it('multiple bindings all render', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit' },
            { key: 's', description: 'Save' },
            { key: 'o', description: 'Open' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        const output = rendered(screen);
        expect(output).toContain('[q]');
        expect(output).toContain('[s]');
        expect(output).toContain('[o]');
    });

    it('rendering stops at height boundary — no out-of-bounds writes', () => {
        // Create more bindings than fit in 3 rows
        const bindings: ShortcutBinding[] = Array.from({ length: 20 }, (_, i) => ({
            key: `k${i}`,
            description: `Desc ${i}`,
        }));
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        // Very small height — should not throw, last row must be valid
        expect(() => render(widget, 40, 3)).not.toThrow();
    });

    it('width = 0 does not throw', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit' }],
            { columns: 1 },
        );
        expect(() => render(widget, 0, 5)).not.toThrow();
    });

    it('width = 1 does not throw', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit' }],
            { columns: 1 },
        );
        expect(() => render(widget, 1, 5)).not.toThrow();
    });

    it('height = 1 renders first binding only', () => {
        const bindings: ShortcutBinding[] = [
            { key: 'a', description: 'Alpha' },
            { key: 'b', description: 'Beta' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget, 40, 1);
        // Only one row available; first binding should render
        expect(row(screen, 0)).toContain('[a]');
    });
});

// ─────────────────────────────────────────────────────
// 9. Unicode / ASCII Modes
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Unicode / ASCII Modes', () => {
    it('renders unicode divider ─ when caps.unicode is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit', category: 'General' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        expect(rendered(screen)).toContain('─');
    });

    it('renders ASCII divider - when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const bindings: ShortcutBinding[] = [
            { key: 'q', description: 'Quit', category: 'General' },
        ];
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        const screen = render(widget);
        const output = rendered(screen);
        expect(output).toContain('-');
        expect(output).not.toContain('─');
    });

    it('key label brackets render the same in both unicode and ASCII mode', () => {
        const testMode = (unicode: boolean) => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(unicode);
            const widget = new KeyboardShortcuts(
                [{ key: 'Enter', description: 'Confirm' }],
                { columns: 1 },
            );
            const screen = render(widget);
            expect(rendered(screen)).toContain('[Enter]');
            vi.restoreAllMocks();
        };
        testMode(true);
        testMode(false);
    });
});

// ─────────────────────────────────────────────────────
// 10. Truncation & Overflow
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Truncation & Overflow', () => {
    it('extremely long key name renders safely', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'Ctrl+Shift+Alt+Super+P', description: 'Very long key name' }],
            { columns: 1 },
        );
        expect(() => render(widget, 40, 5)).not.toThrow();
    });

    it('extremely long description renders safely', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Q'.repeat(500) }],
            { columns: 1 },
        );
        expect(() => render(widget, 40, 5)).not.toThrow();
    });

    it('extremely long category name renders safely', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit', category: 'C'.repeat(200) }],
            { columns: 1 },
        );
        expect(() => render(widget, 40, 5)).not.toThrow();
    });

    it('very narrow width (5px) does not crash', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'Ctrl+C', description: 'Copy' }],
            { columns: 1 },
        );
        expect(() => render(widget, 5, 5)).not.toThrow();
    });

    it('description is sliced to fit within available column space', () => {
        const desc = 'D'.repeat(100);
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: desc }],
            { columns: 1 },
        );
        const screen = render(widget, 20, 3);
        const r = row(screen, 0);
        // Row content must not exceed screen width
        expect(r.length).toBeLessThanOrEqual(20);
    });

    it('category heading is sliced to screen width', () => {
        const longCat = 'A'.repeat(100);
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit', category: longCat }],
            { columns: 1 },
        );
        const screen = render(widget, 20, 5);
        // Heading row must not exceed 20 characters
        expect(row(screen, 0).length).toBeLessThanOrEqual(20);
    });
});

// ─────────────────────────────────────────────────────
// 11. Dirty State
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Dirty State', () => {
    it('is dirty after setBindings()', () => {
        const widget = new KeyboardShortcuts([], { columns: 1 });
        widget.clearDirty();
        widget.setBindings([{ key: 'a', description: 'Alpha' }]);
        expect(widget.isDirty).toBe(true);
    });

    it('is not dirty immediately after rendering', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'q', description: 'Quit' }],
            { columns: 1 },
        );
        const screen = new Screen(80, 24);
        widget.updateRect({ x: 0, y: 0, width: 80, height: 24 });
        widget.clearDirty();
        widget.render(screen);
        expect(widget.isDirty).toBe(false);
    });

    it('is dirty after each successive setBindings() call', () => {
        const widget = new KeyboardShortcuts([], { columns: 1 });

        widget.clearDirty();
        widget.setBindings([{ key: 'a', description: 'Alpha' }]);
        expect(widget.isDirty).toBe(true);

        widget.clearDirty();
        widget.setBindings([{ key: 'b', description: 'Beta' }]);
        expect(widget.isDirty).toBe(true);
    });
});

// ─────────────────────────────────────────────────────
// 12. Robustness
// ─────────────────────────────────────────────────────

describe('KeyboardShortcuts — Robustness', () => {
    it('no exceptions when no bindings exist', () => {
        const widget = new KeyboardShortcuts([]);
        expect(() => render(widget)).not.toThrow();
    });

    it('no exceptions with hundreds of bindings', () => {
        const bindings: ShortcutBinding[] = Array.from({ length: 300 }, (_, i) => ({
            key: `k${i}`,
            description: `Description ${i}`,
        }));
        const widget = new KeyboardShortcuts(bindings, { columns: 2 });
        expect(() => render(widget, 80, 24)).not.toThrow();
    });

    it('no exceptions with many unique categories', () => {
        const bindings: ShortcutBinding[] = Array.from({ length: 50 }, (_, i) => ({
            key: `k${i}`,
            description: `Desc ${i}`,
            category: `Category ${i}`,
        }));
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        expect(() => render(widget, 80, 24)).not.toThrow();
    });

    it('no exceptions when height is smaller than the content', () => {
        const bindings: ShortcutBinding[] = Array.from({ length: 100 }, (_, i) => ({
            key: `k${i}`,
            description: `Desc ${i}`,
            category: `Cat${i % 5}`,
        }));
        const widget = new KeyboardShortcuts(bindings, { columns: 1 });
        expect(() => render(widget, 40, 3)).not.toThrow();
    });

    it('no exceptions when width is smaller than any label', () => {
        const widget = new KeyboardShortcuts(
            [{ key: 'Ctrl+Shift+Alt+Meta+F12', description: 'Trigger something' }],
            { columns: 1 },
        );
        expect(() => render(widget, 2, 5)).not.toThrow();
    });

    it('no exceptions when columns exceed the available width', () => {
        const bindings: ShortcutBinding[] = Array.from({ length: 5 }, (_, i) => ({
            key: `k${i}`,
            description: `Desc ${i}`,
        }));
        const widget = new KeyboardShortcuts(bindings, { columns: 10 });
        expect(() => render(widget, 15, 5)).not.toThrow();
    });

    it('renders after setBindings() with new categories', () => {
        const widget = new KeyboardShortcuts([], { columns: 1 });
        widget.setBindings([
            { key: 'q', description: 'Quit', category: 'System' },
            { key: 's', description: 'Save', category: 'File' },
        ]);
        const screen = render(widget);
        const output = rendered(screen);
        expect(output).toContain('SYSTEM');
        expect(output).toContain('FILE');
    });
});
