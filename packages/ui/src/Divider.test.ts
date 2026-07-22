// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Divider component
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { Divider } from './Divider.js';

/** Render a Divider into a fresh Screen and return both. */
function renderDivider(
    options: ConstructorParameters<typeof Divider>[0] = {},
    width = 20,
    height = 1,
) {
    const divider = new Divider(options);
    const screen = new Screen(width, height);
    divider.updateRect({ x: 0, y: 0, width, height });
    divider.render(screen);
    return { divider, screen };
}

/** Read row 0 of the back buffer as a plain string. */
function row0(screen: Screen): string {
    return screen.getLine(0);
}

describe('Divider', () => {
    // ── preserved originals ──────────────────────────────────────────────

    it('creates with default character', () => {
        const d = new Divider();
        expect(d).toBeDefined();
    });

    it('accepts custom character', () => {
        const d = new Divider({ char: '═' });
        expect(d).toBeDefined();
    });

    it('accepts title option', () => {
        const d = new Divider({ title: 'Section' });
        expect(d).toBeDefined();
    });

    // ── 1. Default character rendering ───────────────────────────────────
    it('default char fills full width with ─', () => {
        const width = 20;
        const { screen } = renderDivider({}, width);
        const row = row0(screen);
        expect(row).toBe('─'.repeat(width));
    });

    it('rendered output length matches width', () => {
        const width = 30;
        const { screen } = renderDivider({}, width);
        expect(row0(screen)).toHaveLength(width);
    });

    // ── 2. Custom character rendering ────────────────────────────────────
    it('custom char = fills entire width', () => {
        const width = 20;
        const { screen } = renderDivider({ char: '=' }, width);
        expect(row0(screen)).toBe('='.repeat(width));
    });

    it('custom char fills full width with no truncation', () => {
        const width = 15;
        const { screen } = renderDivider({ char: '-' }, width);
        const row = row0(screen);
        expect(row).toHaveLength(width);
        expect(row).toBe('-'.repeat(width));
    });

    // ── 3. Unicode character rendering ───────────────────────────────────
    it('unicode char ═ appears correctly across full width', () => {
        const width = 18;
        const { screen } = renderDivider({ char: '═' }, width);
        const row = row0(screen);
        expect(row).toHaveLength(width);
        expect(row).toBe('═'.repeat(width));
    });

    // ── 4. Title rendering ───────────────────────────────────────────────
    it('title appears exactly once in the rendered row', () => {
        const { screen } = renderDivider({ title: 'Section' }, 30);
        const row = row0(screen);
        expect(row.split('Section').length - 1).toBe(1);
    });

    it('divider characters appear on both sides of the title', () => {
        const { screen } = renderDivider({ title: 'Section' }, 30);
        const row = row0(screen);
        const paddedTitle = ' Section ';
        const titleIdx = row.indexOf(paddedTitle);
        expect(titleIdx).toBeGreaterThan(0);
        // left segment is all divider chars
        expect(row.slice(0, titleIdx)).toMatch(/^─+$/);
        // right segment is all divider chars
        expect(row.slice(titleIdx + paddedTitle.length)).toMatch(/^─+$/);
    });

    it('title is surrounded by a space on each side', () => {
        const { screen } = renderDivider({ title: 'Hi' }, 20);
        const row = row0(screen);
        expect(row).toContain(' Hi ');
    });

    // ── 5. Title centering ───────────────────────────────────────────────
    it('title is visually centered: left and right padding differ by at most 1', () => {
        const width = 40;
        const { screen } = renderDivider({ title: 'Center' }, width);
        const row = row0(screen);
        const paddedTitle = ' Center ';
        const titleIdx = row.indexOf(paddedTitle);
        expect(titleIdx).toBeGreaterThan(0);
        const leftLen = titleIdx;
        const rightLen = width - titleIdx - paddedTitle.length;
        expect(Math.abs(leftLen - rightLen)).toBeLessThanOrEqual(1);
    });

    // ── 6. Long title handling ───────────────────────────────────────────
    it('long title does not throw with a small width', () => {
        expect(() =>
            renderDivider({ title: 'This is a very long divider title' }, 8),
        ).not.toThrow();
    });

    it('long title output never exceeds available width', () => {
        const width = 8;
        const { screen } = renderDivider({ title: 'This is a very long divider title' }, width);
        expect(row0(screen).length).toBeLessThanOrEqual(width);
    });

    // ── 7. Empty title behaves like plain divider ────────────────────────
    it('empty title produces a plain line with no extra spaces', () => {
        const width = 20;
        const { screen } = renderDivider({ title: '' }, width);
        expect(row0(screen)).toBe('─'.repeat(width));
    });

    // ── 8. Width = 0 ─────────────────────────────────────────────────────
    it('width 0 returns safely without throwing', () => {
        expect(() => renderDivider({}, 0)).not.toThrow();
    });

    // ── 9. Width = 1 ─────────────────────────────────────────────────────
    it('width 1 renders exactly one character without crashing', () => {
        const { screen } = renderDivider({}, 1);
        expect(row0(screen)).toHaveLength(1);
        expect(row0(screen)).toBe('─');
    });

    // ── 10. Very small width with title ──────────────────────────────────
    it('width 2 with a title clips safely and does not throw', () => {
        expect(() => renderDivider({ title: 'ABC' }, 2)).not.toThrow();
        const { screen } = renderDivider({ title: 'ABC' }, 2);
        expect(row0(screen).length).toBeLessThanOrEqual(2);
    });

    // ── 11. Color application ─────────────────────────────────────────────
    it('custom red color is applied to all rendered cells', () => {
        const color = { type: 'named' as const, name: 'red' as const };
        const width = 12;
        const { screen } = renderDivider({ color }, width);
        for (let c = 0; c < width; c++) {
            expect(screen.back[0][c].fg).toEqual(color);
        }
    });

    it('color is applied to title-row cells as well', () => {
        const color = { type: 'named' as const, name: 'blue' as const };
        const width = 30;
        const { screen } = renderDivider({ title: 'Hello', color }, width);
        // spot-check: first cell (left line segment) has the custom color
        expect(screen.back[0][0].fg).toEqual(color);
    });

    // ── 12. Dim styling ───────────────────────────────────────────────────
    it('all rendered cells have dim = true', () => {
        const width = 15;
        const { screen } = renderDivider({}, width);
        for (let c = 0; c < width; c++) {
            expect(screen.back[0][c].dim).toBe(true);
        }
    });

    it('dim is true for title-row cells too', () => {
        const width = 30;
        const { screen } = renderDivider({ title: 'Dim' }, width);
        for (let c = 0; c < width; c++) {
            expect(screen.back[0][c].dim).toBe(true);
        }
    });

    // ── 13. No-throw guarantees ───────────────────────────────────────────
    it('does not throw for default, titled, custom-char, and custom-color variants', () => {
        expect(() => renderDivider({})).not.toThrow();
        expect(() => renderDivider({ title: 'Hello' })).not.toThrow();
        expect(() => renderDivider({ char: '=' })).not.toThrow();
        expect(() =>
            renderDivider({ color: { type: 'named', name: 'green' } }),
        ).not.toThrow();
    });

    // ── 14. Full width utilization ────────────────────────────────────────
    it('renders exactly 50 characters for a width-50 screen', () => {
        const width = 50;
        const { screen } = renderDivider({}, width);
        const row = row0(screen);
        expect(row).toHaveLength(width);
        expect(row).toBe('─'.repeat(width));
    });

    // ── 15. Mixed title + custom character ────────────────────────────────
    it('custom char with title: output contains title and custom char on both sides', () => {
        const width = 20;
        const { screen } = renderDivider({ char: '=', title: 'Menu' }, width);
        const row = row0(screen);
        expect(row).toContain('Menu');
        // left and right segments use '='
        const paddedTitle = ' Menu ';
        const titleIdx = row.indexOf(paddedTitle);
        expect(titleIdx).toBeGreaterThan(0);
        expect(row.slice(0, titleIdx)).toMatch(/^=+$/);
        expect(row.slice(titleIdx + paddedTitle.length)).toMatch(/^=+$/);
    });

    // ── 16. Repeated rendering stability ─────────────────────────────────
    it('repeated rendering of the same divider produces identical output', () => {
        const divider = new Divider({ title: 'Stable' });
        const width = 30;
        divider.updateRect({ x: 0, y: 0, width, height: 1 });

        const s1 = new Screen(width, 1);
        divider.render(s1);
        const row1 = s1.getLine(0);

        const s2 = new Screen(width, 1);
        divider.render(s2);
        const row2 = s2.getLine(0);

        expect(row1).toBe(row2);
    });

    // ── 17. Large width rendering ─────────────────────────────────────────
    it('renders correctly across a large width of 200', () => {
        const width = 200;
        const { screen } = renderDivider({}, width);
        const row = row0(screen);
        expect(row).toHaveLength(width);
        expect(row).toBe('─'.repeat(width));
    });
});
