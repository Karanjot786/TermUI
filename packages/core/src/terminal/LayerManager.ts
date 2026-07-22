// ─────────────────────────────────────────────────────
// @termuijs/core — Layer Manager for overlay rendering
// ─────────────────────────────────────────────────────

import type { Cell } from './Screen.js';
import { emptyCell, type Screen } from './Screen.js';
import type { Color } from '../style/Color.js';
import type { Rect } from '../layout/Rect.js';
import { segmenter, segmentWidth } from '../utils/unicode.js';

/**
 * A rendering layer. Each layer has its own cell grid and z-index.
 * Higher z-index layers render on top of lower ones during compositing.
 */
export interface Layer {
    /** Unique identifier for this layer */
    id: string;
    /** Stacking order — higher renders on top */
    zIndex: number;
    /** Cell grid (same dimensions as Screen) */
    cells: Cell[][];
    /** Whether this layer is visible */
    visible: boolean;
    /** Bounding box of cells written since last clear (null = nothing dirty) */
    dirtyRegion: Rect | null;
}

/**
 * Check if a cell is "transparent" (should show through to the layer below).
 * An empty cell with no explicit colors is considered transparent.
 */
function isCellTransparent(cell: Cell): boolean {
    // Wide character continuation cells (empty string, zero width) are transparent
    if (cell.char === '' && cell.width === 0) return true;
    return (
        cell.char === ' ' &&
        cell.fg.type === 'none' &&
        cell.bg.type === 'none' &&
        !cell.bold &&
        !cell.italic &&
        !cell.underline &&
        !cell.dim &&
        !cell.strikethrough &&
        !cell.inverse
    );
}

/**
 * Manages multiple rendering layers for overlay support.
 *
 * The base layer (z=0) is the primary widget layer — always opaque.
 * Overlay layers (z>0) support transparency: only cells explicitly
 * written to them overwrite the base layer during compositing.
 *
 * Typical z-index values:
 * - 0:    Base widget layer
 * - 10:   Dropdown menus
 * - 100:  Modal dialogs
 * - 1000: Toasts / notifications
 */
export class LayerManager {
    private _layers: Map<string, Layer> = new Map();
    private _cols: number;
    private _rows: number;
    private _hitWidgetGrid!: (string | null)[][];
    private _hitZGrid!: number[][];

    constructor(cols: number, rows: number) {
        this._cols = cols;
        this._rows = rows;
        this._allocateHitGrids();
    }

    get cols(): number { return this._cols; }
    get rows(): number { return this._rows; }

    /**
     * Create a new overlay layer.
     * @param id   Unique identifier (e.g. 'modal', 'select-dropdown', 'toast')
     * @param zIndex  Stacking order (higher = rendered on top)
     */
    createLayer(id: string, zIndex: number): Layer {
        if (this._layers.has(id)) {
            return this._layers.get(id)!;
        }

        const layer: Layer = {
            id,
            zIndex,
            cells: this._createGrid(),
            visible: true,
            dirtyRegion: null,
        };

        this._layers.set(id, layer);
        return layer;
    }

    /**
     * Remove an overlay layer and clean up its resources.
     */
    removeLayer(id: string): void {
        this._layers.delete(id);
    }

    /**
     * Get a layer by ID.
     */
    getLayer(id: string): Layer | undefined {
        return this._layers.get(id);
    }

    /**
     * Check if a layer exists.
     */
    hasLayer(id: string): boolean {
        return this._layers.has(id);
    }

    /**
     * Get all layers sorted by z-index (ascending).
     */
    getSortedLayers(): Layer[] {
        return Array.from(this._layers.values())
            .filter(l => l.visible)
            .sort((a, b) => a.zIndex - b.zIndex);
    }

    /**
     * Write a cell to a specific layer.
     */
    setCell(layerId: string, col: number, row: number, cell: Partial<Cell>): void {
        const layer = this._layers.get(layerId);
        if (!layer) return;

        col = Math.floor(col);
        row = Math.floor(row);
        if (!(col >= 0 && col < this._cols && row >= 0 && row < this._rows)) return;

        const existing = layer.cells[row][col];
        Object.assign(existing, cell);

        // Expand dirty region
        this._expandDirty(layer, col, row);
    }

    /**
     * Write a string to a specific layer at position (col, row).
     */
    writeString(
        layerId: string,
        col: number,
        row: number,
        str: string,
        style: Partial<Omit<Cell, 'char' | 'width'>> = {},
    ): void {
        const layer = this._layers.get(layerId);
        if (!layer) return;

        row = Math.floor(row);
        col = Math.floor(col);
        if (!(row >= 0 && row < this._rows)) return;

        let x = col;
        for (const { segment: char } of segmenter.segment(str)) {
            if (x >= this._cols) break;
            const charWidth = segmentWidth(char);
            if (x < 0) { x += charWidth; continue; }

            this.setCell(layerId, x, row, { char, width: charWidth, ...style });
            // For wide characters, fill the continuation cell with width: 0
            // to match Screen.writeString() behavior and prevent stray spaces
            // during compositing.
            if (charWidth === 2 && x + 1 < this._cols) {
                this.setCell(layerId, x + 1, row, { char: '', width: 0, ...style });
            }
            x += charWidth;
        }
    }

    /**
     * Check whether any visible layer has pending dirty changes.
     */
    hasDirtyLayers(): boolean {
        for (const layer of this._layers.values()) {
            if (layer.visible && layer.dirtyRegion) {
                return true;
            }
        }
        return false;
    }

    /**
     * Clear all cells in a specific layer.
     */
    clearLayer(id: string): void {
        const layer = this._layers.get(id);
        if (!layer) return;

        for (let r = 0; r < this._rows; r++) {
            for (let c = 0; c < this._cols; c++) {
                layer.cells[r][c] = emptyCell();
            }
        }
        layer.dirtyRegion = { x: 0, y: 0, width: this._cols, height: this._rows };
    }

    /**
     * Clear all overlay layers.
     */
    clearAll(): void {
        for (const layer of this._layers.values()) {
            this.clearLayer(layer.id);
        }
    }

    /**
     * Composite all overlay layers onto the Screen's back buffer.
     * Layers are applied in z-index order (lowest first).
     * Transparent cells (empty with no colors) are skipped.
     * Writes directly to screen.back to avoid setCell overhead
     * (bounds/clip checks are already satisfied by dirtyRegion).
     */
    composite(screen: Screen): void {
        const sorted = this.getSortedLayers();

        for (const layer of sorted) {
            if (!layer.dirtyRegion) continue;

            const { x: dx, y: dy, width: dw, height: dh } = layer.dirtyRegion;
            const maxRow = Math.min(dy + dh, this._rows);
            const maxCol = Math.min(dx + dw, this._cols);

            for (let r = dy; r < maxRow; r++) {
                const backRow = screen.back[r];
                const layerRow = layer.cells[r];
                if (!backRow || !layerRow) continue;

                let c = dx;
                while (c < maxCol) {
                    const cell = layerRow[c];
                    if (isCellTransparent(cell)) {
                        c++;
                        continue;
                    }
                    Object.assign(backRow[c], cell);

                    // Handle wide characters atomically: write continuation
                    // cells and advance by the full width so continuation
                    // cells (width 0, char '') aren't processed individually
                    // where they'd be treated as non-transparent and
                    // overwrite valid screen content.
                    const w = cell.width ?? 1;
                    for (let i = 1; i < w; i++) {
                        if (c + i < maxCol) {
                            Object.assign(backRow[c + i], layerRow[c + i]);
                        }
                    }
                    c += w;
                }
            }
        }
    }

    /**
     * Resize all layers when the terminal is resized.
     */
    resize(cols: number, rows: number): void {
        this._cols = cols;
        this._rows = rows;

        for (const layer of this._layers.values()) {
            layer.cells = this._createGrid();
            layer.dirtyRegion = { x: 0, y: 0, width: cols, height: rows };
        }

        this._allocateHitGrids();
    }

    /** Reset the hit grid. Call once at the start of each frame. */
    clearHitGrid(): void {
        this._allocateHitGrids();
    }

    /**
     * Mark a rectangular region as owned by a widget at a given z-index.
     * Higher z wins when regions overlap.
     */
    setHitRegion(widgetId: string, x: number, y: number, w: number, h: number, z?: number): void {
        const zVal = z ?? 0;
        const startX = Math.floor(x);
        const startY = Math.floor(y);
        const width = Math.floor(w);
        const height = Math.floor(h);

        for (let r = startY; r < startY + height; r++) {
            if (r < 0 || r >= this._rows) continue;
            for (let c = startX; c < startX + width; c++) {
                if (c < 0 || c >= this._cols) continue;

                if (zVal >= this._hitZGrid[r][c]) {
                    this._hitWidgetGrid[r][c] = widgetId;
                    this._hitZGrid[r][c] = zVal;
                }
            }
        }
    }

    /** Return the topmost widget id at a cell, or null. */
    hitTest(col: number, row: number): string | null {
        const c = Math.floor(col);
        const r = Math.floor(row);
        if (c < 0 || c >= this._cols || r < 0 || r >= this._rows) {
            return null;
        }
        return this._hitWidgetGrid[r][c];
    }

    /**
     * Create an empty cell grid.
     */
    private _createGrid(): Cell[][] {
        const grid: Cell[][] = [];
        for (let r = 0; r < this._rows; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < this._cols; c++) {
                row.push(emptyCell());
            }
            grid.push(row);
        }
        return grid;
    }

    /**
     * Allocate parallel hit grid and z-index grid.
     */
    private _allocateHitGrids(): void {
        this._hitWidgetGrid = [];
        this._hitZGrid = [];
        for (let r = 0; r < this._rows; r++) {
            const widgetRow: (string | null)[] = [];
            const zRow: number[] = [];
            for (let c = 0; c < this._cols; c++) {
                widgetRow.push(null);
                zRow.push(-Infinity);
            }
            this._hitWidgetGrid.push(widgetRow);
            this._hitZGrid.push(zRow);
        }
    }

    /**
     * Expand the dirty region of a layer to include the given cell.
     */
    private _expandDirty(layer: Layer, col: number, row: number): void {
        if (!layer.dirtyRegion) {
            layer.dirtyRegion = { x: col, y: row, width: 1, height: 1 };
            return;
        }

        const r = layer.dirtyRegion;
        const newX = Math.min(r.x, col);
        const newY = Math.min(r.y, row);
        const newRight = Math.max(r.x + r.width, col + 1);
        const newBottom = Math.max(r.y + r.height, row + 1);
        r.x = newX;
        r.y = newY;
        r.width = newRight - newX;
        r.height = newBottom - newY;
    }
}
