// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Rule widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Rule } from './Rule.js';
import { Screen, caps } from '@termuijs/core';

afterEach(() => vi.restoreAllMocks());

/** Helper: create a Rule, set rect, render to a screen, return both. */
function renderRule(
    style: ConstructorParameters<typeof Rule>[0] = {},
    opts: ConstructorParameters<typeof Rule>[1] = {},
    width = 20,
    height = 1,
) {
    const rule = new Rule(style, opts);
    const screen = new Screen(width, height);
    rule.updateRect({ x: 0, y: 0, width, height });
    rule.render(screen);
    return { rule, screen };
}

/** Read a single row from the back buffer as a plain string. */
function rowText(screen: Screen, row: number): string {
    return screen.getLine(row);
}

describe('Rule', () => {
    // ── 1. Horizontal rule fills the row with the line glyph ─────────────
    it('horizontal rule fills the row with the line glyph', () => {
        const { screen } = renderRule({}, {}, 20, 1);
        const row = rowText(screen, 0);
        const hz = caps.unicode ? '─' : '-';
        // Every cell should be the line glyph
        expect(row).toBe(hz.repeat(20));
    });

    // ── 2. Title renders centered in the horizontal rule ─────────────────
    it('title renders centered in the horizontal rule', () => {
        const { screen } = renderRule({}, { title: 'Logs' }, 20, 1);
        const row = rowText(screen, 0);
        expect(row).toContain('Logs');
        // Line glyphs should appear on both sides of the title
        const hz = caps.unicode ? '─' : '-';
        expect(row).toContain(hz);
        // Title should be roughly centered: " Logs " is 6 chars, so
        // leftLen = floor((20 - 6) / 2) = 7, title starts at col 7
        const titleIndex = row.indexOf(' Logs ');
        expect(titleIndex).toBeGreaterThan(0);
        // There should be line glyphs after the title too
        const afterTitle = row.slice(titleIndex + 6);
        expect(afterTitle).toContain(hz);
    });

    // ── 3. Vertical rule fills the column height ─────────────────────────
    it('vertical rule fills the column height', () => {
        const { screen } = renderRule({}, { orientation: 'vertical' }, 1, 5);
        const vt = caps.unicode ? '│' : '|';
        for (let r = 0; r < 5; r++) {
            expect(screen.back[r][0].char).toBe(vt);
        }
    });

    // ── 4. setTitle updates the rendered output ──────────────────────────
    it('setTitle updates the rendered output and marks dirty', () => {
        const rule = new Rule({}, { title: 'Old' });
        rule.clearDirty();
        rule.setTitle('New');
        expect(rule.isDirty).toBe(true);

        // Re-render and verify new title appears
        const screen = new Screen(20, 1);
        rule.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        rule.render(screen);
        const row = rowText(screen, 0);
        expect(row).toContain('New');
        expect(row).not.toContain('Old');
    });

    // ── 5. ASCII fallback when caps.unicode is false ─────────────────────
    it('ASCII fallback line renders when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderRule({}, { title: 'Logs' }, 20, 1);
        const row = rowText(screen, 0);
        expect(row).toContain('Logs');
        expect(row).toContain('-');
        // Should NOT contain Unicode line glyphs
        expect(row).not.toContain('─');
    });

    // ── 6. Vertical rule uses ASCII fallback ─────────────────────────────
    it('vertical rule uses ASCII fallback when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderRule({}, { orientation: 'vertical' }, 1, 3);
        for (let r = 0; r < 3; r++) {
            expect(screen.back[r][0].char).toBe('|');
        }
    });

    // ── 7. Line uses opts.color, default brightBlack ─────────────────────
    it('uses default brightBlack color', () => {
        const { screen } = renderRule({}, {}, 10, 1);
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'brightBlack' });
    });

    it('uses custom color from opts', () => {
        const color = { type: 'named' as const, name: 'cyan' as const };
        const { screen } = renderRule({}, { color }, 10, 1);
        expect(screen.back[0][0].fg).toEqual(color);
    });

    // ── 8. Edge cases ────────────────────────────────────────────────────
    it('handles zero-size rect without error', () => {
        expect(() => renderRule({}, {}, 0, 0)).not.toThrow();
    });

    it('handles title wider than available width', () => {
        expect(() => renderRule({}, { title: 'Very Long Title' }, 5, 1)).not.toThrow();
    });
});
