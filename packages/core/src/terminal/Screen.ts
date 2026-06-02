// ─────────────────────────────────────────────────────
// @termuijs/core — Screen buffer (double-buffered cell grid)
// ─────────────────────────────────────────────────────

import type { Color } from '../style/Color.js';
import { stringWidth } from '../utils/unicode.js';
import { caps } from './env-caps.js';

const EMPTY_COLOR: Color = Object.freeze({ type: 'none' } as const);

/**
 * A single cell in the terminal grid.
 */
export interface Cell {
    /** The character displayed (single grapheme cluster) */
    char: string;
    /** Foreground color */
    fg: Color;
    /** Background color */
    bg: Color;
    /** Bold text */
    bold: boolean;
    /** Italic text */
    italic: boolean;
    /** Underline text */
    underline: boolean;
    /** Dim text */
    dim: boolean;
    /** Strikethrough text */
    strikethrough: boolean;
    /** Inverse colors */
    inverse: boolean;
    /**
     * Visual width of this cell.
     * - 1 for normal characters
     * - 2 for wide chars (CJK/emoji) — the next cell is a "continuation" cell
     * - 0 for continuation cells (second half of a wide char)
     */
    width: number;
}

/** Create a blank cell with default attributes */
export function emptyCell(): Cell {
    return {
        char: ' ',
        fg: EMPTY_COLOR,
        bg: EMPTY_COLOR,
        bold: false,
        italic: false,
        underline: false,
        dim: false,
        strikethrough: false,
        inverse: false,
        width: 1,
    };
}

/** Reset a cell in-place to default attributes (avoids allocation). */
export function resetCell(cell: Cell): void {
    cell.char = ' ';
    cell.fg = EMPTY_COLOR;
    cell.bg = EMPTY_COLOR;
    cell.bold = false;
    cell.italic = false;
    cell.underline = false;
    cell.dim = false;
    cell.strikethrough = false;
    cell.inverse = false;
    cell.width = 1;
}

/** Check if two cells are visually identical */
export function cellsEqual(a: Cell, b: Cell): boolean {
    return (
        a.char === b.char &&
        a.bold === b.bold &&
        a.italic === b.italic &&
        a.underline === b.underline &&
        a.dim === b.dim &&
        a.strikethrough === b.strikethrough &&
        a.inverse === b.inverse &&
        a.width === b.width &&
        colorsEqual(a.fg, b.fg) &&
        colorsEqual(a.bg, b.bg)
    );
}

function colorsEqual(a: Color, b: Color): boolean {
    if (a.type !== b.type) return false;
    switch (a.type) {
        case 'none': return true;
        case 'named': return a.name === (b as typeof a).name;
        case 'ansi256': return a.code === (b as typeof a).code;
        case 'rgb': return a.r === (b as typeof a).r && a.g === (b as typeof a).g && a.b === (b as typeof a).b;
        case 'hex': return a.hex === (b as typeof a).hex;
    }
}

/**
 * Double-buffered 2D cell grid for the terminal.
 *
 * - `front` = what's currently displayed on screen
 * - `back` = what we're building for the next frame
 *
 * After rendering, the renderer diffs `front` vs `back` and only emits
 * changes, then swaps the buffers.
 */
export class Screen {
    private _cols: number;
    private _rows: number;
    private _previousLines: string[] = [];
    front: Cell[][];
    back: Cell[][];

    /**
     * Stack of clipping regions. When non-empty, setCell/writeString
     * only write to cells within the topmost clip rectangle.
     */
    private _clipStack: Array<{ x: number; y: number; width: number; height: number }> = [];

    constructor(cols: number, rows: number) {
        this._cols = cols;
        this._rows = rows;
        this.front = this._createGrid(cols, rows);
        this.back = this._createGrid(cols, rows);
    }

    /** Serialize a back-buffer row to a plain string (skips continuation cells). */
    getLine(row: number): string {
        if (row < 0 || row >= this._rows) return '';
        return this.back[row]
            .filter(cell => cell.width !== 0)
            .map(cell => cell.char || ' ')
            .join('');
    }

    /** Return the saved line string for the given row (empty before first saveLines call). */
    getPreviousLine(row: number): string {
        return this._previousLines[row] ?? '';
    }

    /** Snapshot the current back-buffer line strings for use by diffRenderer. */
    saveLines(): void {
        this._previousLines = [];
        for (let r = 0; r < this._rows; r++) {
            this._previousLines.push(this.getLine(r));
        }
    }

    get cols(): number { return this._cols; }
    get rows(): number { return this._rows; }

    /**
     * Push a clipping region onto the stack.
     * All subsequent setCell/writeString calls will be constrained
     * to cells within this rectangle. Clips are intersected with
     * any parent clip already on the stack (nested clipping).
     */
    pushClip(region: { x: number; y: number; width: number; height: number }): void {
        if (this._clipStack.length > 0) {
            // Intersect with the current clip
            const parent = this._clipStack[this._clipStack.length - 1];
            const x = Math.max(region.x, parent.x);
            const y = Math.max(region.y, parent.y);
            const right = Math.min(region.x + region.width, parent.x + parent.width);
            const bottom = Math.min(region.y + region.height, parent.y + parent.height);
            if (right <= x || bottom <= y) {
                // Fully clipped — push a zero-size region
                this._clipStack.push({ x: 0, y: 0, width: 0, height: 0 });
            } else {
                this._clipStack.push({ x, y, width: right - x, height: bottom - y });
            }
        } else {
            this._clipStack.push({ ...region });
        }
    }

    /**
     * Pop the most recent clipping region from the stack.
     */
    popClip(): void {
        this._clipStack.pop();
    }

    /**
     * Get the current active clip region, or null if no clip is active.
     */
    get activeClip(): { x: number; y: number; width: number; height: number } | null {
        return this._clipStack.length > 0
            ? this._clipStack[this._clipStack.length - 1]
            : null;
    }

    /**
     * Write a cell to the back buffer at position (col, row).
     */
    setCell(col: number, row: number, cell: Partial<Cell>): void {
        // Floor to integers — layout engine may produce fractional values
        col = Math.floor(col);
        row = Math.floor(row);
        // Use positive range check (NaN fails >= 0, preventing NaN indices)
        if (!(col >= 0 && col < this._cols && row >= 0 && row < this._rows)) return;

        // Enforce clip region
        if (this._clipStack.length > 0) {
            const clip = this._clipStack[this._clipStack.length - 1];
            if (col < clip.x || col >= clip.x + clip.width ||
                row < clip.y || row >= clip.y + clip.height) {
                return; // Outside active clip — silently discard
            }
        }

        const existing = this.back[row][col];
        Object.assign(existing, cell);
    }

    /**
     * Write a string to the back buffer starting at (col, row).
     * Applies the provided style attributes to each character.
     */
    writeString(
        col: number,
        row: number,
        str: string,
        style: Partial<Omit<Cell, 'char' | 'width'>> = {},
    ): void {
        row = Math.floor(row);
        col = Math.floor(col);
        if (!(row >= 0 && row < this._rows)) return;

        let x = col;
        for (const char of str) {
            if (x >= this._cols) break;

            let finalChar = char;
            // Measure the visual width with the shared unicode utility
            let width = stringWidth(char);

            // Advance past off-screen-left cells by the real width
            if (x < 0) { x += width; continue; }

            // Fallback for terminals without wide-character support
            if (width > 1 && !caps.unicode) {
                finalChar = '*'; // safe single-cell substitute
                width = 1;
            }

            // Skip zero-width characters (combining marks) so they do not overwrite
            if (width === 0) continue;

            this.setCell(x, row, {
                char: finalChar,
                width,
                ...style,
            });

            // Mark continuation cells for wide characters
            for (let i = 1; i < width; i++) {
                if (x + i < this._cols) {
                    this.setCell(x + i, row, {
                        char: '',
                        width: 0,
                        ...style,
                    });
                }
            }

            x += width;
        }
    }

    /**
     * Clear the back buffer to all empty cells.
     */
    clear(): void {
        this._clipStack = [];
        for (let r = 0; r < this._rows; r++) {
            for (let c = 0; c < this._cols; c++) {
                resetCell(this.back[r][c]);
            }
        }
    }

    /**
     * Swap front and back buffers. Called after rendering diffs.
     */
    swap(): void {
        const temp = this.front;
        this.front = this.back;
        this.back = temp;
    }

    /**
     * Resize the screen. Clears both buffers.
     */
    resize(cols: number, rows: number): void {
        this._cols = cols;
        this._rows = rows;
        this.front = this._createGrid(cols, rows);
        this.back = this._createGrid(cols, rows);
    }

    /**
     * Clear the front buffer (marks everything as "needs redraw").
     */
    invalidate(): void {
        for (let r = 0; r < this._rows; r++) {
            for (let c = 0; c < this._cols; c++) {
                this.front[r][c] = { ...emptyCell(), char: '\0' }; // force diff
            }
        }
    }

    private _createGrid(cols: number, rows: number): Cell[][] {
        const grid: Cell[][] = [];
        for (let r = 0; r < rows; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < cols; c++) {
                row.push(emptyCell());
            }
            grid.push(row);
        }
        return grid;
    }
}
