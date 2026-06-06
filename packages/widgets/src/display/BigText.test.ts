// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for BigText widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { BigText } from './BigText.js';

describe('BigText', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders a single character correctly (3x5)', () => {
        const widget = new BigText('A');
        const screen = new Screen(10, 10);
        widget.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        widget.render(screen);

        // 'A' is:
        //  # 
        // # #
        // ###
        // # #
        // # #
        // (3 wide, 5 tall)

        // Row 0: " # "
        expect(screen.back[0][0].char).toBe(' ');
        expect(screen.back[0][1].char).toBe('█');
        expect(screen.back[0][2].char).toBe(' ');

        // Row 1: "# #"
        expect(screen.back[1][0].char).toBe('█');
        expect(screen.back[1][1].char).toBe(' ');
        expect(screen.back[1][2].char).toBe('█');

        // Row 2: "###"
        expect(screen.back[2][0].char).toBe('█');
        expect(screen.back[2][1].char).toBe('█');
        expect(screen.back[2][2].char).toBe('█');

        // Check height
        expect(screen.back[4][0].char).toBe('█');
        expect(screen.back[5][0].char).toBe(' '); // Row 5 should be empty
    });

    it('renders multi-character string with correct width and gap', () => {
        const widget = new BigText('HI');
        const screen = new Screen(20, 10);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        widget.render(screen);

        // 'H' (3 wide) + 1 gap + 'I' (3 wide) = 7 total width
        // Row 0 of 'H': "# #" -> █ █
        // Row 0 of 'I': "###" -> █ █ █
        
        // 'H' at x=0..2
        expect(screen.back[0][0].char).toBe('█');
        expect(screen.back[0][1].char).toBe(' ');
        expect(screen.back[0][2].char).toBe('█');

        // Gap at x=3
        expect(screen.back[0][3].char).toBe(' ');

        // 'I' at x=4..6
        expect(screen.back[0][4].char).toBe('█');
        expect(screen.back[0][5].char).toBe('█');
        expect(screen.back[0][6].char).toBe('█');

        // Empty at x=7
        expect(screen.back[0][7].char).toBe(' ');
    });

    it('falls back to space block for unknown characters', () => {
        const widget = new BigText('?'); // '?' is not in CHAR_MAP
        const screen = new Screen(10, 10);
        widget.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        widget.render(screen);

        // Should be all spaces for 3x5 area
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 3; c++) {
                expect(screen.back[r][c].char).toBe(' ');
            }
        }
    });

    it('respects screen boundaries', () => {
        const widget = new BigText('ABC');
        const screen = new Screen(5, 10); // Only enough width for one char + gap? 
        // 3 (A) + 1 gap + 3 (B) = 7. So 'B' won't fit if width is 5.
        widget.updateRect({ x: 0, y: 0, width: 5, height: 10 });
        widget.render(screen);

        // 'A' should be there
        expect(screen.back[0][1].char).toBe('█');
        // 'B' starts at x=4. x+width = 4+3 = 7. 7 > 5. So 'B' should not be rendered.
        expect(screen.back[0][4].char).toBe(' '); 
    });

    it('uses ASCII fallback when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        
        const widget = new BigText('A');
        const screen = new Screen(10, 10);
        widget.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        widget.render(screen);

        // Row 0: " # " -> " # "
        expect(screen.back[0][1].char).toBe('#');
    });

    it('converts text to uppercase', () => {
        const widget = new BigText('a'); // lowercase
        const screen = new Screen(10, 10);
        widget.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        widget.render(screen);

        // Should render 'A'
        expect(screen.back[0][1].char).toBe('█');
    });
});
