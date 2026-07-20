// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Style utilities
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mergeStyles, defaultStyle, normalizeEdges, styleToCellAttrs } from './Style.js';

describe('mergeStyles', () => {
    it('deep-merges two style objects', () => {
        const base = defaultStyle();
        const override = { bold: true, fg: { type: 'named' as const, name: 'red' as const } };
        const merged = mergeStyles(base, override);
        expect(merged.bold).toBe(true);
        expect(merged.fg).toEqual({ type: 'named', name: 'red' });
    });

    it('preserves unset properties from base', () => {
        const base = { ...defaultStyle(), bold: true, italic: true };
        const override = { bold: false };
        const merged = mergeStyles(base, override);
        expect(merged.bold).toBe(false);
        expect(merged.italic).toBe(true);
    });
});

describe('defaultStyle', () => {
    it('returns expected defaults', () => {
        const s = defaultStyle();
        expect(s.visible).toBe(true);
        expect(s.flexDirection).toBe('column');
        expect(s.justifyContent).toBe('flex-start');
        expect(s.alignItems).toBe('stretch');
        expect(s.flexGrow).toBe(0);
        expect(s.flexShrink).toBe(1);
    });
});

describe('normalizeEdges', () => {
    it('converts number to uniform edges', () => {
        expect(normalizeEdges(2)).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
    });

    it('fills missing partial edges with 0', () => {
        expect(normalizeEdges({ top: 1, left: 2 })).toEqual({ top: 1, right: 0, bottom: 0, left: 2 });
    });

    it('returns zeros for undefined', () => {
        expect(normalizeEdges(undefined)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    });
});

describe('styleToCellAttrs', () => {
    it('maps fg/bg/bold correctly', () => {
        const style = { ...defaultStyle(), fg: { type: 'named' as const, name: 'cyan' as const }, bold: true };
        const attrs = styleToCellAttrs(style);
        expect(attrs.fg).toEqual({ type: 'named', name: 'cyan' });
        expect(attrs.bold).toBe(true);
        expect(attrs.italic).toBe(false);
        expect(attrs.bg).toEqual({ type: 'none' });
    });
});
