import { describe, expect, it } from 'vitest';
import { Screen } from '@termuijs/core';
import type { Style } from '@termuijs/core';
import { Watermark, type WatermarkOptions } from './Watermark.js';

function renderWatermark(
    text: string,
    style: Partial<Style> = {},
    opts: WatermarkOptions = {},
    width = 8,
    height = 3,
) {
    const watermark = new Watermark(text, style, opts);
    const screen = new Screen(width, height);
    watermark.updateRect({ x: 0, y: 0, width, height });
    watermark.render(screen);
    return { watermark, screen };
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(cell => cell.char).join('');
}

describe('Watermark', () => {
    it('renders text on row 0', () => {
        const { screen } = renderWatermark('AB');

        expect(rowText(screen, 0)).toBe('ABABABAB');
    });

    it('wraps text and continues on row 1', () => {
        const { screen } = renderWatermark('ABC', {}, {}, 5, 2);

        expect(rowText(screen, 0)).toBe('ABCAB');
        expect(rowText(screen, 1)).toBe('CABCA');
    });

    it('angle 45 shifts row 1 by one character relative to row 0', () => {
        const { screen } = renderWatermark('ABC', {}, { angle: 45 }, 6, 2);

        expect(rowText(screen, 0)).toBe('ABCABC');
        expect(rowText(screen, 1)).toBe('BCABCA');
    });

    it('setText updates rendered text and marks dirty', () => {
        const watermark = new Watermark('AA');
        const screen = new Screen(6, 2);

        watermark.clearDirty();
        watermark.setText('XY');
        expect(watermark.isDirty).toBe(true);

        watermark.updateRect({ x: 0, y: 0, width: 6, height: 2 });
        watermark.render(screen);

        expect(rowText(screen, 0)).toBe('XYXYXY');
    });

    it('does not mark dirty when setText receives the same value', () => {
        const watermark = new Watermark('CONFIDENTIAL');
    
        watermark.clearDirty();
    
        watermark.setText('CONFIDENTIAL');
    
        expect(watermark.isDirty).toBe(false);
    });
    
    it('marks dirty when setText receives a different value', () => {
        const watermark = new Watermark('CONFIDENTIAL');
    
        watermark.clearDirty();
    
        watermark.setText('INTERNAL');
    
        expect(watermark.isDirty).toBe(true);
    });

});
