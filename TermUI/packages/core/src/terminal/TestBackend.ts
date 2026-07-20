// ─────────────────────────────────────────────────────
// @termuijs/core — Test Backend
// In-memory rendering for snapshot testing.
// ─────────────────────────────────────────────────────

import type { Cell } from './Screen.js';
import { emptyCell } from './Screen.js';

/**
 * In-memory grid that captures rendered output.
 * Use `createTestScreen()` to create one, render widgets into it,
 * then call `testScreenToString()` to get a plain-text snapshot.
 */
export interface TestScreen {
    readonly width: number;
    readonly height: number;
    cells: Cell[][];
}

/**
 * Create an in-memory test screen of the given dimensions.
 * Every cell starts as empty (space character, default colors).
 */
export function createTestScreen(width: number, height: number): TestScreen {
    const cells: Cell[][] = [];
    for (let row = 0; row < height; row++) {
        const rowCells: Cell[] = [];
        for (let col = 0; col < width; col++) {
            rowCells.push(emptyCell());
        }
        cells.push(rowCells);
    }
    return { width, height, cells };
}

/**
 * Set a cell in the test screen at (x, y).
 * Out-of-bounds writes are silently ignored.
 */
export function testScreenSetCell(screen: TestScreen, x: number, y: number, cell: Cell): void {
    if (x < 0 || x >= screen.width || y < 0 || y >= screen.height) {
        return;
    }
    const row = screen.cells[y];
    if (row) {
        row[x] = cell;
    }
}

/**
 * Get the cell at (x, y) in the test screen.
 * Returns undefined for out-of-bounds coordinates.
 */
export function testScreenGetCell(screen: TestScreen, x: number, y: number): Cell | undefined {
    if (x < 0 || x >= screen.width || y < 0 || y >= screen.height) {
        return undefined;
    }
    const row = screen.cells[y];
    return row ? row[x] : undefined;
}

/**
 * Convert the test screen to a plain-text string.
 * Each row becomes a line. Trailing spaces on each line are preserved.
 *
 * Example output:
 * ```
 * ┌Hello──┐
 * │World  │
 * └───────┘
 * ```
 */
export function testScreenToString(screen: TestScreen): string {
    return screen.cells
        .map(row => row.map(cell => cell.char).join(''))
        .join('\n');
}

/**
 * Clear the test screen, resetting all cells to empty.
 */
export function testScreenClear(screen: TestScreen): void {
    for (let y = 0; y < screen.height; y++) {
        const row = screen.cells[y];
        if (row) {
            for (let x = 0; x < screen.width; x++) {
                row[x] = emptyCell();
            }
        }
    }
}

/**
 * Write a string into the test screen starting at (x, y).
 * Characters that fall outside the screen bounds are clipped.
 */
export function testScreenSetString(
    screen: TestScreen,
    x: number,
    y: number,
    str: string,
): void {
    let cx = x;
    for (const ch of str) {
        if (cx >= screen.width) break;
        if (cx >= 0 && y >= 0 && y < screen.height) {
            const row = screen.cells[y];
            if (row) {
                const cell = emptyCell();
                cell.char = ch;
                row[cx] = cell;
            }
        }
        cx++;
    }
}
