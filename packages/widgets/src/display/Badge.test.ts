// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Badge widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Badge, type BadgeOptions } from './Badge.js';
import { Screen, caps } from '@termuijs/core';
import type { Style } from '@termuijs/core';

/** Helper: create widget, set rect, render to a screen, return both. */
function renderBadge(
    text: string,
    style: Partial<Style> = {},
    opts: BadgeOptions = {},
    width = 20,
    height = 3,
) {
    const badge = new Badge(text, style, opts);
    const screen = new Screen(width, height);
    badge.updateRect({ x: 0, y: 0, width, height });
    badge.render(screen);
    return { badge, screen };
}

/** Read a single row from the back buffer as a plain string. */
function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

describe('Badge', () => {
    // ── 1. Default render ────────────────────────────────────────────────
    it('renders text inside a bordered box with default neutral variant', () => {
        const { screen } = renderBadge('ok');
        // Row 1 is the content row; text should appear space-padded: " ok "
        const contentRow = rowText(screen, 1);
        expect(contentRow).toContain('ok');
    });

    it('renders top border with Unicode box-drawing corners', () => {
        const { screen } = renderBadge('hi');
        // Top-left corner should be ┌ in unicode mode
        expect(screen.back[0][0].char).toBe('┌');
    });

    it('renders bottom border with Unicode box-drawing corners', () => {
        const { screen } = renderBadge('hi');
        // Bottom-left corner should be └
        expect(screen.back[2][0].char).toBe('└');
    });

    // ── 2. Variant colors ────────────────────────────────────────────────
    it('applies cyan background for info variant', () => {
        const { screen } = renderBadge('info', {}, { variant: 'info' });
        // Content cell (row 1, col 1 = first char of padded text " info ")
        // The space char at col 1 should have the cyan background
        expect(screen.back[1][1].bg).toEqual({ type: 'named', name: 'cyan' });
    });

    it('applies green background for success variant', () => {
        const { screen } = renderBadge('ok', {}, { variant: 'success' });
        expect(screen.back[1][1].bg).toEqual({ type: 'named', name: 'green' });
    });

    it('applies yellow background for warning variant', () => {
        const { screen } = renderBadge('warn', {}, { variant: 'warning' });
        expect(screen.back[1][1].bg).toEqual({ type: 'named', name: 'yellow' });
    });

    it('applies red background for error variant', () => {
        const { screen } = renderBadge('err', {}, { variant: 'error' });
        expect(screen.back[1][1].bg).toEqual({ type: 'named', name: 'red' });
    });

    it('applies white background for neutral variant', () => {
        const { screen } = renderBadge('ok', {}, { variant: 'neutral' });
        expect(screen.back[1][1].bg).toEqual({ type: 'named', name: 'white' });
    });

    // ── 3. ASCII fallback ────────────────────────────────────────────────
    it('uses ASCII border chars when caps.unicode is false', () => {
        const orig = caps.unicode;
        (caps as any).unicode = false;
        try {
            const { screen } = renderBadge('test');
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
        const badge = new Badge('old');
        badge.clearDirty();
        badge.setText('new');
        expect(badge.isDirty).toBe(true);
        expect(badge.getText()).toBe('new');
    });

    it('setVariant marks widget dirty', () => {
        const badge = new Badge('ok');
        badge.clearDirty();
        badge.setVariant('error');
        expect(badge.isDirty).toBe(true);
        expect(badge.getVariant()).toBe('error');
    });

    // ── 5. Edge cases ────────────────────────────────────────────────────
    it('handles empty text without error', () => {
        expect(() => renderBadge('')).not.toThrow();
    });

    it('handles zero-size rect without error', () => {
        expect(() => renderBadge('test', {}, {}, 0, 0)).not.toThrow();
    });

    // ── 6. Constructor overloads ──────────────────────────────────────────
    it('deprecated signature Badge(text, opts) produces console.warn', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            new Badge('dep', { variant: 'info' });
            expect(spy).toHaveBeenCalledWith(
                'Badge(text, opts, style) is deprecated. Use Badge(text, style, opts) instead.',
            );
        } finally {
            spy.mockRestore();
        }
    });

    it('canonical signature Badge(text, style, opts) does not produce console.warn', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            new Badge('canon', {}, { variant: 'info' });
            expect(spy).not.toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });

    it('deprecated and canonical signatures produce equivalent output', () => {
        const { screen: screen1 } = renderBadge('same', {}, { variant: 'error' });
        // Construct with deprecated overload (opts as second arg)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const badge2 = new Badge('same', { variant: 'error' });
            const screen2 = new Screen(20, 3);
            badge2.updateRect({ x: 0, y: 0, width: 20, height: 3 });
            badge2.render(screen2);
            // First row should match
            expect(screen2.back[0][0].char).toBe(screen1.back[0][0].char);
            expect(screen2.back[1][2].char).toBe(screen1.back[1][2].char);
            expect(warnSpy).toHaveBeenCalled();
        } finally {
            warnSpy.mockRestore();
        }
    });
});
