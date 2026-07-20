// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Canvas widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Canvas } from './Canvas.js';
import { Screen, BRAILLE_OFFSET, BRAILLE_DOTS } from '@termuijs/core';

describe('Canvas', () => {
    it('creates an empty canvas without errors', () => {
        expect(() => new Canvas()).not.toThrow();
    });

    it('renders empty canvas with spaces', () => {
        const canvas = new Canvas({ width: 5, height: 3 });
        const screen = new Screen(10, 5);
        canvas.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        canvas.render(screen);
        expect(screen.back[0][0].char).toBe(' ');
        expect(screen.back[2][4].char).toBe(' ');
    });

    it('renders Braille characters for set pixels', () => {
        const canvas = new Canvas({ width: 5, height: 3 });
        const screen = new Screen(10, 5);
        
        // Ensure size initializes
        canvas.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        canvas.render(screen);
        
        canvas.setPixel(0, 0, true);
        canvas.setPixel(1, 0, true);
        
        canvas.render(screen);
        
        const expectedCharCode = BRAILLE_OFFSET | BRAILLE_DOTS[0][0] | BRAILLE_DOTS[0][1];
        expect(screen.back[0][0].char).toBe(String.fromCharCode(expectedCharCode));
    });

    it('fillRect correctly fills a region', () => {
        const canvas = new Canvas({ width: 5, height: 3 });
        const screen = new Screen(10, 5);
        
        canvas.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        canvas.render(screen);
        
        // Fill a 2x4 pixel block which corresponds to exactly 1 full Braille cell (1 column, 1 row)
        canvas.fillRect(0, 0, 2, 4);
        canvas.render(screen);
        
        const fullBraille = String.fromCharCode(BRAILLE_OFFSET | 0xFF);
        expect(screen.back[0][0].char).toBe(fullBraille);
        // Next cell should be empty
        expect(screen.back[0][1].char).toBe(' ');
    });

    it('clear removes all pixels', () => {
        const canvas = new Canvas({ width: 5, height: 3 });
        const screen = new Screen(10, 5);
        
        canvas.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        canvas.render(screen);
        
        canvas.fillRect(0, 0, 10, 10);
        canvas.render(screen);
        
        canvas.clear();
        canvas.render(screen);
        
        expect(screen.back[0][0].char).toBe(' ');
    });

    it('lineTo draws a line', () => {
        const canvas = new Canvas({ width: 5, height: 5 });
        const screen = new Screen(10, 10);
        
        canvas.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        canvas.render(screen);
        
        canvas.lineTo(0, 0, 2, 0); // 3 pixels horizontally
        canvas.render(screen);
        
        // It spans across 2 cells (col 0, col 1) since each cell is 2px wide.
        const firstCellBraille = String.fromCharCode(BRAILLE_OFFSET | BRAILLE_DOTS[0][0] | BRAILLE_DOTS[0][1]);
        const secondCellBraille = String.fromCharCode(BRAILLE_OFFSET | BRAILLE_DOTS[0][0]);
        
        expect(screen.back[0][0].char).toBe(firstCellBraille);
        expect(screen.back[0][1].char).toBe(secondCellBraille);
    });

    it('drawCircle creates a circle without throwing', () => {
        const canvas = new Canvas({ width: 10, height: 10 });
        const screen = new Screen(10, 10);
        
        canvas.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        canvas.render(screen);
        
        canvas.drawCircle(5, 5, 4);
        canvas.render(screen);
        
        // Assert that at least something was drawn (not empty)
        let hasContent = false;
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
                if (screen.back[r][c].char !== ' ') {
                    hasContent = true;
                }
            }
        }
        expect(hasContent).toBe(true);
    });

    it('buffers drawing commands before layout and replays them on initial render', () => {
        const canvas = new Canvas({ width: 5, height: 3 });
        const screen = new Screen(10, 5);

        // Draw immediately before layout/render
        canvas.setPixel(0, 0, true);
        canvas.setPixel(1, 0, true);

        // Layout and render
        canvas.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        canvas.render(screen);

        const expectedCharCode = BRAILLE_OFFSET | BRAILLE_DOTS[0][0] | BRAILLE_DOTS[0][1];
        expect(screen.back[0][0].char).toBe(String.fromCharCode(expectedCharCode));
    });
});
