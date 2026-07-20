// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Screen buffer
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen, emptyCell, cellsEqual } from '../terminal/Screen.js';
import { caps } from '../terminal/env-caps.js';

describe('Screen', () => {
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