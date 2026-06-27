import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { adjustForContrast } from './contrast.js';
import { contrastRatio, parseColor, styleToCellAttrs } from '../index.js';

describe('adjustForContrast', () => {
    it('returns foreground color unchanged if it already meets target ratio', () => {
        const fg = parseColor('#ffffff'); // White
        const bg = parseColor('#000000'); // Black
        const result = adjustForContrast(fg, bg, 4.5);
        expect(result).toEqual(fg);
    });

    it('adjusts foreground color to meet target ratio (dark foreground on light background)', () => {
        // Red on light pink
        const fg = parseColor('#ff5555');
        const bg = parseColor('#ffebeb');
        const adjusted = adjustForContrast(fg, bg, 4.5);
        const ratio = contrastRatio(adjusted, bg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('adjusts foreground color to meet target ratio (light foreground on dark background)', () => {
        // Dark grey on dark blue
        const fg = parseColor('#333333');
        const bg = parseColor('#000033');
        const adjusted = adjustForContrast(fg, bg, 4.5);
        const ratio = contrastRatio(adjusted, bg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
});

describe('styleToCellAttrs with TERMUI_ACCESSIBILITY_STRICT', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('does not adjust colors if strict mode is disabled', () => {
        process.env['TERMUI_ACCESSIBILITY_STRICT'] = '0';
        const fg = parseColor('#ff5555');
        const bg = parseColor('#ffebeb');
        const attrs = styleToCellAttrs({ fg, bg });
        expect(attrs.fg).toEqual(fg);
    });

    it('adjusts colors if strict mode is enabled', () => {
        process.env['TERMUI_ACCESSIBILITY_STRICT'] = '1';
        const fg = parseColor('#ff5555');
        const bg = parseColor('#ffebeb');
        const attrs = styleToCellAttrs({ fg, bg });
        expect(contrastRatio(attrs.fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
});
