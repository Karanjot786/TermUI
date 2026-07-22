// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for symbols constants
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    BorderSets,
    BarSets,
    VERTICAL_BAR_SYMBOLS,
    HORIZONTAL_BAR_SYMBOLS,
    ScrollbarSets,
    LineSets,
    Shade,
    BRAILLE_OFFSET,
    BRAILLE_DOTS
} from './symbols.js';

describe('symbols constants', () => {
    it('BorderSets contains correct styles', () => {
        expect(BorderSets.PLAIN.topLeft).toBe('┌');
        expect(BorderSets.ROUNDED.topLeft).toBe('╭');
        expect(BorderSets.DOUBLE.topLeft).toBe('╔');
        expect(BorderSets.THICK.topLeft).toBe('┏');
        expect(BorderSets.EMPTY.topLeft).toBe(' ');
        expect(BorderSets.QUADRANT_INSIDE.topLeft).toBe('▗');
        expect(BorderSets.QUADRANT_OUTSIDE.topLeft).toBe('▛');
    });

    it('BarSets contains correct mappings', () => {
        expect(BarSets.NINE_LEVELS.full).toBe('█');
        expect(BarSets.THREE_LEVELS.full).toBe('█');
        expect(BarSets.ASCII.full).toBe('#');
    });

    it('VERTICAL_BAR_SYMBOLS has 9 levels', () => {
        expect(VERTICAL_BAR_SYMBOLS).toHaveLength(9);
        expect(VERTICAL_BAR_SYMBOLS[0]).toBe(' ');
        expect(VERTICAL_BAR_SYMBOLS[8]).toBe('█');
    });

    it('HORIZONTAL_BAR_SYMBOLS has 9 levels', () => {
        expect(HORIZONTAL_BAR_SYMBOLS).toHaveLength(9);
        expect(HORIZONTAL_BAR_SYMBOLS[0]).toBe(' ');
        expect(HORIZONTAL_BAR_SYMBOLS[8]).toBe('\u2588');
    });

    it('ScrollbarSets contains valid scrollbar elements', () => {
        expect(ScrollbarSets.VERTICAL.thumb).toBe('█');
        expect(ScrollbarSets.HORIZONTAL.thumb).toBe('█');
        expect(ScrollbarSets.DOUBLE_VERTICAL.track).toBe('║');
    });

    it('LineSets contains correct line elements', () => {
        expect(LineSets.NORMAL.horizontal).toBe('─');
        expect(LineSets.THICK.horizontal).toBe('━');
        expect(LineSets.DOUBLE.horizontal).toBe('═');
    });

    it('Shade contains correct block values', () => {
        expect(Shade.FULL).toBe('█');
        expect(Shade.DARK).toBe('▓');
        expect(Shade.MEDIUM).toBe('▒');
        expect(Shade.LIGHT).toBe('░');
        expect(Shade.EMPTY).toBe(' ');
    });

    it('Braille constants are valid', () => {
        expect(BRAILLE_OFFSET).toBe(0x2800);
        expect(BRAILLE_DOTS).toHaveLength(4);
        expect(BRAILLE_DOTS[0]).toEqual([0x01, 0x08]);
    });
});
