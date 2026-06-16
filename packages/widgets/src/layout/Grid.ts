// ─────────────────────────────────────────────────────
// @termuijs/widgets — CSS Grid Layout Widgets
// ─────────────────────────────────────────────────────

import type { Screen, Style } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface GridOptions {
    /** CSS grid-template-columns track definitions, e.g. "1fr 2fr", "10 20" or number of columns */
    columns?: number | string;
    /** CSS grid-template-rows track definitions, e.g. "1fr 1fr", "auto" or number of rows */
    rows?: number | string;
    /** Grid gap in characters/cells */
    gap?: number;
}

export interface GridItemOptions {
    /** grid-column-start index (1-indexed) or "span N" */
    columnStart?: number | string;
    /** grid-column-end index (1-indexed) or "span N" */
    columnEnd?: number | string;
    /** grid-row-start index (1-indexed) or "span N" */
    rowStart?: number | string;
    /** grid-row-end index (1-indexed) or "span N" */
    rowEnd?: number | string;
}

/**
 * Grid — a true CSS-Grid-like layout container.
 */
export class Grid extends Widget {
    constructor(style: Partial<Style> = {}, options: GridOptions = {}) {
        const columns = typeof options.columns === 'number'
            ? Array(Math.max(1, options.columns)).fill('1fr').join(' ')
            : options.columns;
        const rows = typeof options.rows === 'number'
            ? Array(Math.max(1, options.rows)).fill('1fr').join(' ')
            : options.rows;

        super({
            display: 'grid',
            gridTemplateColumns: columns,
            gridTemplateRows: rows,
            gridGap: options.gap,
            ...style
        });
    }

    /** Add an item explicitly (alias for addChild) */
    addItem(widget: Widget): void {
        this.addChild(widget);
    }

    /** Remove all items and reset the grid */
    clearItems(): void {
        for (const child of this._children) {
            child.unmount();
            child.parent = null;
        }
        this._children = [];
        this.markDirty();
    }

    protected _renderSelf(_screen: Screen): void {
        // Grid is a pure layout container — no self-rendering needed.
    }
}

/**
 * GridItem — a child container that can define grid column/row spans or starts.
 */
export class GridItem extends Widget {
    constructor(style: Partial<Style> = {}, options: GridItemOptions = {}) {
        super({
            gridColumnStart: options.columnStart,
            gridColumnEnd: options.columnEnd,
            gridRowStart: options.rowStart,
            gridRowEnd: options.rowEnd,
            ...style
        });
    }

    protected _renderSelf(_screen: Screen): void {
        // Pure layout container — no self-rendering needed.
    }
}
