// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Screen buffer
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, emptyCell, resetCell, cellsEqual } from './Screen.js';
import { caps } from './env-caps.js';
import { hyperlinkOpen, hyperlinkClose } from '../utils/ansi.js';

describe('Screen', () => {
    afterEach(() => vi.restoreAllMocks());

    it('initializes with correct dimensions', () => {
        const screen = new Screen(10, 5);
        expect(screen.cols).toBe(10);
        expect(screen.rows).toBe(5);
    });

    it('sets a cell in the back buffer', () => {
        const screen = new Screen(10, 5);
        screen.setCell(3, 2, { char: 'X', bold: true });
        expect(screen.back[2][3].char).toBe('X');
        expect(screen.back[2][3].bold).toBe(true);
    });

    it('ignores out-of-bounds setCell', () => {
        const screen = new Screen(10, 5);
        screen.setCell(-1, 0, { char: 'X' });
        screen.setCell(0, -1, { char: 'X' });
        screen.setCell(10, 0, { char: 'X' });
        screen.setCell(0, 5, { char: 'X' });
        // No errors thrown
    });

    it('writes a string to the back buffer', () => {
        const screen = new Screen(10, 5);
        screen.writeString(0, 0, 'Hello');
        expect(screen.back[0][0].char).toBe('H');
        expect(screen.back[0][1].char).toBe('e');
        expect(screen.back[0][4].char).toBe('o');
    });

    it('clears back buffer to empty cells', () => {
        const screen = new Screen(5, 3);
        screen.setCell(1, 1, { char: 'X' });
        screen.clear();
        expect(screen.back[1][1].char).toBe(' ');
    });

    it('swaps front and back buffers', () => {
        const screen = new Screen(5, 3);
        screen.setCell(0, 0, { char: 'A' });
        const backBefore = screen.back;
        const frontBefore = screen.front;
        screen.swap();
        expect(screen.front).toBe(backBefore);
        expect(screen.back).toBe(frontBefore);
    });

    it('resizes correctly', () => {
        const screen = new Screen(10, 5);
        screen.resize(20, 10);
        expect(screen.cols).toBe(20);
        expect(screen.rows).toBe(10);
    });

    it('invalidates forces all cells to be dirty', () => {
        const screen = new Screen(3, 2);
        screen.invalidate();
        expect(screen.front[0][0].char).toBe('\0');
    });

    it('resize resets all ancillary state', () => {
        const screen = new Screen(10, 5);

        // Set up some state
        screen.pushClip({ x: 0, y: 0, width: 5, height: 3 });
        screen.pushTranslateY(2);
        screen.writeAnsi('\x1b[31m');
        screen.applyBackdropFilter({ x: 0, y: 0, width: 3, height: 3 });

        // Resize
        screen.resize(20, 10);

        expect(screen.cols).toBe(20);
        expect(screen.rows).toBe(10);
        expect(screen.activeClip).toBeNull();
        expect(screen.drainAnsiQueue()).toBe('');
        expect(screen.getPreviousLine(0)).toBe('');
        // Write after resize and verify it lands correctly (no stale clip/translate)
        screen.setCell(15, 8, { char: 'Z' });
        expect(screen.back[8][15].char).toBe('Z');
    });

    it('writeString applies style attributes (bold, fg)', () => {
        const screen = new Screen(10, 5);
        screen.writeString(0, 0, 'Hi', { bold: true, fg: { type: 'named', name: 'red' } });
        expect(screen.back[0][0].bold).toBe(true);
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'red' });
    });

    it('writeString clips at right edge', () => {
        const screen = new Screen(5, 3);
        screen.writeString(0, 0, 'ABCDEFGH'); // 8 chars into 5 cols
        expect(screen.back[0][4].char).toBe('E');
        // Should not have written beyond col 4
    });

    it('writeString clips at bottom edge (invalid row)', () => {
        const screen = new Screen(10, 3);
        // Row 5 is out of bounds (only 0-2 valid)
        screen.writeString(0, 5, 'Hello');
        // No crash — screen is unchanged
        expect(screen.back[0][0].char).toBe(' ');
    });

    it('writeString handles wide CJK characters with unicode support enabled', () => {
        const screen = new Screen(10, 3);
        screen.writeString(0, 0, '你好');
        expect(screen.back[0][0].char).toBe('你');
        expect(screen.back[0][0].width).toBe(2);
        expect(screen.back[0][1].width).toBe(0); // continuation cell
        expect(screen.back[0][2].char).toBe('好');
    });

    it('writeString degrades wide characters to * when unicode support is missing', () => {
        const spy = vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        
        const screen = new Screen(10, 3);
        screen.writeString(0, 0, '你好'); // 2 wide characters
        
        // They should degrade into 2 individual * characters taking up only 1 space each
        expect(screen.back[0][0].char).toBe('*');
        expect(screen.back[0][0].width).toBe(1);
        expect(screen.back[0][1].char).toBe('*');
        expect(screen.back[0][1].width).toBe(1);

        spy.mockRestore();
    });

    it('setCell floors fractional coordinates', () => {
        const screen = new Screen(10, 5);
        screen.setCell(2.7, 1.3, { char: 'X' });
        expect(screen.back[1][2].char).toBe('X');
    });

    it('resize creates new grids at new dimensions', () => {
        const screen = new Screen(10, 5);
        screen.setCell(0, 0, { char: 'A' });
        screen.resize(20, 10);
        expect(screen.cols).toBe(20);
        expect(screen.rows).toBe(10);
        // Old data is reset
        expect(screen.back[0][0].char).toBe(' ');
    });

    it('pushClip with active translateY adjusts clip region correctly', () => {
        const screen = new Screen(20, 10);
        // Push a translate first (simulating a parent ScrollView)
        screen.pushTranslateY(-3);
        // Clip region should be adjusted by the current translate
        screen.pushClip({ x: 0, y: 5, width: 10, height: 4 });

        // setCell applies translate: row 8 + (-3) = 5. With adjusted clip at y=2 (5-3),
        // 5 >= 2 and 5 < 6 should pass → visible
        screen.setCell(1, 8, { char: 'A' });
        expect(screen.back[5][1].char).toBe('A');

        // setCell translates row 9 + (-3) = 6. Clip is at y=2, h=4 → y range [2, 6)
        // 6 is NOT < 6 → clipped
        screen.setCell(1, 9, { char: 'B' });
        expect(screen.back[6][1].char).not.toBe('B');

        screen.popClip();
        screen.popTranslateY();
    });

    it('nested clips with active translate work correctly', () => {
        const screen = new Screen(30, 20);
        // Outer translate (simulating parent ScrollView with scrollOffset=2)
        screen.pushTranslateY(-2);
        screen.pushClip({ x: 0, y: 5, width: 20, height: 10 });

        // Inner translate (simulating child ScrollView with scrollOffset=1)
        screen.pushTranslateY(-1);
        screen.pushClip({ x: 0, y: 8, width: 10, height: 5 });

        // Total translate: -3. inner clip absolute y=8 → adjusted y = 8-3 = 5 in setCell space.
        // Inner clip visual range: y ∈ [5, 10), row ∈ [8, 13) absolute.
        // Content row 8 absolute → visual row 8-3=5 → inside clip (5 >= 5 && 5 < 10) ✓
        screen.setCell(1, 8, { char: 'X' });
        expect(screen.back[5][1].char).toBe('X');

        // Content row 13 absolute → visual row 13-3=10 → outside clip (10 >= 10) → clipped
        screen.setCell(1, 13, { char: 'Y' });
        expect(screen.back[10][1].char).not.toBe('Y');

        screen.popClip();
        screen.popTranslateY();
        screen.popClip();
        screen.popTranslateY();
    });

    it('setCell is clipped by translate-adjusted region when parents have translate', () => {
        const screen = new Screen(30, 20);
        // Simulate: outer container at absolute y=10 with scrollOffset=5
        screen.pushTranslateY(-5);
        // Child clip region at absolute y=14, height=4
        screen.pushClip({ x: 0, y: 14, width: 10, height: 4 });

        // After translate: clip adjusted to y = 14 + (-5) = 9, height=4 → visual range [9, 13)
        // Content that would render at absolute row 15 (first row inside child viewport)
        // visual row = 15 + (-5) = 10 → inside clip (10 >= 9 && 10 < 13) ✓
        screen.setCell(0, 15, { char: 'A' });
        expect(screen.back[10][0].char).toBe('A');

        // Content at absolute row 19 (outside child viewport)
        // visual row = 19 + (-5) = 14 → outside clip (14 >= 13) → clipped
        screen.setCell(0, 19, { char: 'B' });
        expect(screen.back[14][0].char).not.toBe('B');

        screen.popClip();
        screen.popTranslateY();
    });
});

describe('cellsEqual', () => {
    it('returns true for identical cells', () => {
        const a = emptyCell();
        const b = emptyCell();
        expect(cellsEqual(a, b)).toBe(true);
    });

    it('returns false for different chars', () => {
        const a = emptyCell();
        const b = { ...emptyCell(), char: 'X' };
        expect(cellsEqual(a, b)).toBe(false);
    });

    it('returns false for different colors', () => {
        const a = emptyCell();
        const b = { ...emptyCell(), fg: { type: 'named' as const, name: 'red' as const } };
        expect(cellsEqual(a, b)).toBe(false);
    });
});

describe('Screen and Cell Hyperlink Support', () => {
    it('a cell written with link retains it', () => {
        const s = new Screen(20, 1);
        s.setCell(0, 0, { char: 'x', link: 'https://termui.dev' });
        expect(s.back[0][0].link).toBe('https://termui.dev');
    });

    it('emptyCell().link is undefined', () => {
        expect(emptyCell().link).toBeUndefined();
    });

    it('resetCell clears a previously set link', () => {
        const cell = emptyCell();
        cell.link = 'https://termui.dev';
        resetCell(cell);
        expect(cell.link).toBeUndefined();
    });

    it('cellsEqual distinguishes differing links', () => {
        const c1 = emptyCell();
        const c2 = emptyCell();
        
        expect(cellsEqual(c1, c2)).toBe(true);
        
        c1.link = 'https://termui.dev';
        expect(cellsEqual(c1, c2)).toBe(false);
        
        c2.link = 'https://termui.dev';
        expect(cellsEqual(c1, c2)).toBe(true);
    });

    it('hyperlinkOpen produces a valid OSC 8 prefix', () => {
        const url = 'https://termui.dev';
        expect(hyperlinkOpen(url)).toBe(`\x1b]8;;${url}\x1b\\`);
    });

    it('hyperlinkClose produces a valid OSC 8 suffix', () => {
        expect(hyperlinkClose).toBe(`\x1b]8;;\x1b\\`);
    });

    describe('ANSI injection protection', () => {
        it('strips CSI escape sequences from writeString', () => {
            const screen = new Screen(20, 5);
            screen.writeString(0, 0, 'hello\x1b[31mworld');
            const text = screen.back[0].map(c => c.char).join('').trimEnd();
            expect(text).toBe('helloworld');
        });

        it('strips escape sequences from setCell char', () => {
            const screen = new Screen(10, 5);
            screen.setCell(0, 0, { char: '\x1b[2J' });
            expect(screen.back[0][0].char).toBe('');
        });

        it('strips C0 control characters (except tab/LF/CR) from writeString', () => {
            const screen = new Screen(20, 5);
            // \x01 = SOH, \x07 = BEL — both stripped; 'cd' is unaffected
            screen.writeString(0, 0, 'ab\x01\x07cd');
            const text = screen.back[0].map(c => c.char).join('').trimEnd();
            expect(text).toBe('abcd');
        });

        it('preserves normal printable characters', () => {
            const screen = new Screen(20, 5);
            screen.writeString(0, 0, 'Hello, World!');
            const text = screen.back[0].slice(0, 13).map(c => c.char).join('');
            expect(text).toBe('Hello, World!');
        });
    });

    describe('Backdrop Filters (Compositing)', () => {
        it('cells outside the modal rect are dimmed', () => {
            const screen = new Screen(10, 10);
            
            // Draw some base content
            screen.writeString(0, 0, 'Base text ');
            screen.writeString(0, 9, 'Bottom txt');
            
            // Draw a modal in the center (x:2, y:2, w:4, h:4)
            screen.writeString(2, 2, 'Modl');
            screen.writeString(2, 3, 'Text');
            
            // Schedule backdrop filter
            screen.applyBackdropFilter({ x: 2, y: 2, width: 4, height: 4 });
            
            // Apply them (normally called by App during compositing pass)
            screen.flushBackdropFilters();
            
            // Cell inside the modal rect should NOT be dimmed
            expect(screen.back[2][2].dim).toBe(false);
            expect(screen.back[3][3].dim).toBe(false);
            
            // Cells outside the modal rect SHOULD be dimmed
            expect(screen.back[0][0].dim).toBe(true);
            expect(screen.back[9][9].dim).toBe(true);
            expect(screen.back[2][1].dim).toBe(true); // just left of modal
            expect(screen.back[2][6].dim).toBe(true); // just right of modal
        });

        it('multiple overlapping backdrop filters dim everything outside all rects', () => {
            const screen = new Screen(10, 10);
            
            // Modal 1: top-left
            screen.applyBackdropFilter({ x: 0, y: 0, width: 3, height: 3 });
            // Modal 2: bottom-right
            screen.applyBackdropFilter({ x: 7, y: 7, width: 3, height: 3 });
            
            screen.flushBackdropFilters();
            
            // Modal 1 area is NOT dimmed
            expect(screen.back[1][1].dim).toBe(false);
            
            // Modal 2 area is NOT dimmed
            expect(screen.back[8][8].dim).toBe(false);
            
            // Everything else IS dimmed
            expect(screen.back[5][5].dim).toBe(true); // center
            expect(screen.back[0][8].dim).toBe(true); // top right
            expect(screen.back[8][0].dim).toBe(true); // bottom left
        });
    });
});