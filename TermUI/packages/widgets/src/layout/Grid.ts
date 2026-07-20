// ─────────────────────────────────────────────────────
// @termuijs/widgets — Grid layout widget
// ─────────────────────────────────────────────────────

import type { Screen, Style } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { Box } from '../display/Box.js';

export interface GridOptions {
    /** Number of equal-width columns */
    columns: number;
    /** Gap between items in both directions (default: 1) */
    gap?: number;
    /** Row gap override (overrides gap for rows) */
    rowGap?: number;
    /** Column gap override (overrides gap for columns) */
    colGap?: number;
}

/**
 * Grid — a CSS-Grid-like layout widget.
 *
 * Items fill left-to-right, wrapping to a new row every `columns` items.
 * Internally creates a column-flex Box per row, each with equal-flex-grow items.
 *
 * The `addChild()` override means the reconciler's generic child-adding
 * loop works without any special casing.
 */
export class Grid extends Widget {
    private _columns: number;
    private _colGap: number;
    private _rowGap: number;
    private _rows: Box[] = [];
    private _itemCount: number = 0;

    constructor(style: Partial<Style>, options: GridOptions) {
        super({ flexDirection: 'column', ...style });
        this._columns = Math.max(1, options.columns);
        const gap = options.gap ?? 1;
        this._colGap = options.colGap ?? gap;
        this._rowGap = options.rowGap ?? gap;
    }

    protected _renderSelf(_screen: Screen): void {
        // Grid is a pure layout container — no self-rendering needed.
    }

    /**
     * Add a widget to the grid. Items fill left-to-right,
     * wrapping to a new row automatically every `columns` items.
     * Overrides Widget.addChild so the reconciler generic loop works unchanged.
     */
    override addChild(widget: Widget): void {
        const rowIndex = Math.floor(this._itemCount / this._columns);

        // Create a new row Box if needed
        if (rowIndex >= this._rows.length) {
            const rowStyle: Partial<Style> = { flexDirection: 'row' };
            if (this._colGap > 0) rowStyle.gap = this._colGap;
            // Add row gap as margin-top on rows after the first
            if (this._rows.length > 0 && this._rowGap > 0) {
                rowStyle.margin = this._rowGap;
            }
            const row = new Box(rowStyle);
            this._rows.push(row);
            // Register the row as a child of this widget
            super.addChild(row);
        }

        // Add item to the current row with equal flex growth
        const currentRow = this._rows[rowIndex];
        widget.setStyle({ flexGrow: 1 });
        currentRow.addChild(widget);
        this._itemCount++;
    }

    /** Add an item explicitly (alias for addChild) */
    addItem(widget: Widget): void {
        this.addChild(widget);
    }

    /** Remove all items and reset the grid */
    clearItems(): void {
        // Unmount and detach every row
        for (const row of this._rows) {
            row.unmount();
            row.parent = null;
        }
        this._children = [];
        this._rows = [];
        this._itemCount = 0;
    }
}
