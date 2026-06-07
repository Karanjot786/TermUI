// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Tag widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Tag } from './Tag.js';
import { Screen, caps } from '@termuijs/core';

/** Helper: create widget, set rect, render to a screen, return both. */
function renderTag(
    text: string,
    opts: ConstructorParameters<typeof Tag>[1] = {},
    style: ConstructorParameters<typeof Tag>[2] = {},
    width = 20,
    height = 3,
) {
    const tag = new Tag(text, opts, style);
    const screen = new Screen(width, height);
    tag.updateRect({ x: 0, y: 0, width, height });
    tag.render(screen);
    return { tag, screen };
}

/** Read a single row from the back buffer as a plain string. */
function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

describe('Tag', () => {
    // ── 1. Default render ────────────────────────────────────────────────
    it('renders text inside a bordered box with default neutral variant', () => {
        const { screen } = renderTag('ts');
        // Row 1 is the content row; text should appear space-padded: " ts "
        const contentRow = rowText(screen, 1);
        expect(contentRow).toContain('ts');
    });

    it('renders top border with Unicode box-drawing corners', () => {
        const { screen } = renderTag('hi');
        expect(screen.back[0][0].char).toBe('┌');
    });

    it('renders bottom border with Unicode box-drawing corners', () => {
        const { screen } = renderTag('hi');
        expect(screen.back[2][0].char).toBe('└');
    });

    it('does not apply a background fill to content cells', () => {
        const { screen } = renderTag('ts', { variant: 'info' });
        // Tag should NOT set a bg color on content cells (unlike Badge)
        // The bg should remain the default (type: 'none')
        expect(screen.back[1][2].bg).toEqual({ type: 'none' });
    });

    // ── 2. Variant colors (foreground) ───────────────────────────────────
    it('applies cyan foreground for info variant', () => {
        const { screen } = renderTag('info', { variant: 'info' });
        // Border corner should have cyan foreground
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'cyan' });
        // Text cell should also have cyan foreground
        expect(screen.back[1][2].fg).toEqual({ type: 'named', name: 'cyan' });
    });

    it('applies green foreground for success variant', () => {
        const { screen } = renderTag('ok', { variant: 'success' });
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'green' });
    });

    it('applies yellow foreground for warning variant', () => {
        const { screen } = renderTag('warn', { variant: 'warning' });
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'yellow' });
    });

    it('applies red foreground for error variant', () => {
        const { screen } = renderTag('err', { variant: 'error' });
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'red' });
    });

    it('applies white foreground for neutral variant', () => {
        const { screen } = renderTag('ok', { variant: 'neutral' });
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'white' });
    });

    // ── 3. ASCII fallback ────────────────────────────────────────────────
    it('uses ASCII border chars when caps.unicode is false', () => {
        const orig = caps.unicode;
        (caps as any).unicode = false;
        try {
            const { screen } = renderTag('test');
            // ASCII corners should be +
            expect(screen.back[0][0].char).toBe('+');
            expect(screen.back[2][0].char).toBe('+');
            // Horizontal border should be -
            expect(screen.back[0][1].char).toBe('-');
            // Vertical border should be |
            expect(screen.back[1][0].char).toBe('|');
        } finally {
            (caps as any).unicode = orig;
        }
    });

    // ── 4. Setters call markDirty ────────────────────────────────────────

    it('setText marks widget dirty', () => {
        const tag = new Tag('old');
        tag.clearDirty();
        tag.setText('new');

        expect(tag.isDirty).toBe(true);
        expect(tag.getText()).toBe('new');
    });

    it('setVariant marks widget dirty', () => {
        const tag = new Tag('ok');
        tag.clearDirty();
        tag.setVariant('error');

        expect(tag.isDirty).toBe(true);
        expect(tag.getVariant()).toBe('error');
    });

    it('does not mark dirty when text is unchanged', () => {
        const tag = new Tag('Hello');

        tag.clearDirty();
        tag.setText('Hello');

        expect(tag.isDirty).toBe(false);
    });

    it('does not mark dirty when variant is unchanged', () => {
        const tag = new Tag('Hello', { variant: 'success' });

        tag.clearDirty();
        tag.setVariant('success');

        expect(tag.isDirty).toBe(false);
    });

    // ── 5. Edge cases ────────────────────────────────────────────────────
    it('handles empty text without error', () => {
        expect(() => renderTag('')).not.toThrow();
    });

    it('handles zero-size rect without error', () => {
        expect(() => renderTag('test', {}, {}, 0, 0)).not.toThrow();
    });

});
