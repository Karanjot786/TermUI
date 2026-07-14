import { describe, it, expect } from 'vitest';
import {
    createTestScreen,
    testScreenSetCell,
    testScreenGetCell,
    testScreenToString,
    testScreenClear,
    testScreenSetString,
} from './TestBackend.js';
import { emptyCell } from './Screen.js';

describe('TestBackend', () => {
    it('creates a test screen buffer of given width and height', () => {
        const screen = createTestScreen(10, 5);
        expect(screen.width).toBe(10);
        expect(screen.height).toBe(5);
        expect(screen.cells).toHaveLength(5);
        expect(screen.cells[0]).toHaveLength(10);
        expect(screen.cells[0][0]).toEqual(emptyCell());
    });

    it('sets and gets cells correctly', () => {
        const screen = createTestScreen(5, 5);
        const cell = emptyCell();
        cell.char = 'A';

        testScreenSetCell(screen, 2, 2, cell);
        expect(testScreenGetCell(screen, 2, 2)).toEqual(cell);

        // Out-of-bounds writes should be ignored silently
        testScreenSetCell(screen, -1, 0, cell);
        testScreenSetCell(screen, 5, 0, cell);
        testScreenSetCell(screen, 0, -1, cell);
        testScreenSetCell(screen, 0, 5, cell);

        // Out-of-bounds reads should return undefined
        expect(testScreenGetCell(screen, -1, 0)).toBeUndefined();
        expect(testScreenGetCell(screen, 5, 0)).toBeUndefined();
        expect(testScreenGetCell(screen, 0, -1)).toBeUndefined();
        expect(testScreenGetCell(screen, 0, 5)).toBeUndefined();
    });

    it('converts test screen to a string representation', () => {
        const screen = createTestScreen(5, 2);
        testScreenSetString(screen, 0, 0, 'Hello');
        testScreenSetString(screen, 0, 1, 'World');

        expect(testScreenToString(screen)).toBe('Hello\nWorld');
    });

    it('clears all cells to empty', () => {
        const screen = createTestScreen(3, 3);
        testScreenSetString(screen, 0, 0, '123');
        testScreenSetString(screen, 0, 1, '456');

        testScreenClear(screen);

        const empty = emptyCell().char;
        expect(screen.cells[0].map(c => c.char).join('')).toBe(empty.repeat(3));
        expect(screen.cells[1].map(c => c.char).join('')).toBe(empty.repeat(3));
    });

    it('writes a string to the test screen and handles boundary clipping', () => {
        const screen = createTestScreen(10, 3);

        // Within bounds
        testScreenSetString(screen, 2, 1, 'abc');
        expect(screen.cells[1][2].char).toBe('a');
        expect(screen.cells[1][3].char).toBe('b');
        expect(screen.cells[1][4].char).toBe('c');

        // Clipping at right boundary
        testScreenSetString(screen, 8, 0, 'longerstring');
        expect(screen.cells[0][8].char).toBe('l');
        expect(screen.cells[0][9].char).toBe('o');
        expect(screen.cells[0][10]).toBeUndefined();

        // Left boundary out of bounds should clip or handle gracefully
        testScreenSetString(screen, -2, 2, 'hello');
        expect(screen.cells[2][0].char).toBe('l');
        expect(screen.cells[2][1].char).toBe('l');
        expect(screen.cells[2][2].char).toBe('o');
    });
});
