// ─────────────────────────────────────────────────────
// @termuijs/widgets — CSS Grid Layout Widgets
// ─────────────────────────────────────────────────────

import type { Screen, Style } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type GridAreas = string | string[];

export interface GridOptions {
    /** CSS grid-template-columns track definitions, e.g. "1fr 2fr", "10 20" or number of columns */
    columns?: number | string;
    /** CSS grid-template-rows track definitions, e.g. "1fr 1fr", "auto" or number of rows */
    rows?: number | string;
    /** Grid gap in characters/cells */
    gap?: number;
    /** Named grid area rows, e.g. ["header header", "nav main"] */
    areas?: GridAreas;
}

export interface GridAreaPlacement {
    columnStart: number;
    columnEnd: number;
    rowStart: number;
    rowEnd: number;
}

function getWidgetArea(widget: Widget): string | undefined {
    return (widget as { gridArea?: string }).gridArea;
}

function parseGridAreas(areas: GridAreas | undefined): Map<string, GridAreaPlacement> {
    const rows = normalizeAreaRows(areas);
    const placements = new Map<string, GridAreaPlacement>();

    for (let row = 0; row < rows.length; row++) {
        for (let col = 0; col < rows[row].length; col++) {
            const name = rows[row][col];
            if (name === '.') continue;

            const current = placements.get(name);
            if (!current) {
                placements.set(name, {
                    columnStart: col + 1,
                    columnEnd: col + 2,
                    rowStart: row + 1,
                    rowEnd: row + 2,
                });
                continue;
            }

            current.columnStart = Math.min(current.columnStart, col + 1);
            current.columnEnd = Math.max(current.columnEnd, col + 2);
            current.rowStart = Math.min(current.rowStart, row + 1);
            current.rowEnd = Math.max(current.rowEnd, row + 2);
        }
    }

    for (const [name, placement] of placements) {
        for (let row = placement.rowStart - 1; row < placement.rowEnd - 1; row++) {
            for (let col = placement.columnStart - 1; col < placement.columnEnd - 1; col++) {
                if (rows[row]?.[col] !== name) {
                    throw new Error(`Grid area "${name}" must be rectangular`);
                }
            }
        }
    }

    return placements;
}

function normalizeAreaRows(areas: GridAreas | undefined): string[][] {
    if (!areas) return [];

    const rawRows = Array.isArray(areas)
        ? areas
        : areas.split(/\r?\n/);
    const rows = rawRows
        .map(row => row.trim())
        .filter(Boolean)
        .map(row => row.replace(/^['"]|['"]$/g, '').trim().split(/\s+/));

    if (rows.length === 0) return [];

    const width = rows[0].length;
    if (width === 0 || rows.some(row => row.length !== width)) {
        throw new Error('Grid area rows must all have the same number of columns');
    }

    return rows;
}

export interface GridItemOptions {
    /** Named area from the parent Grid area's template */
    area?: string;
    /** grid-column-start index (1-indexed) or "span N" */
    columnStart?: number | string;
    /** grid-column-end index (1-indexed) or "span N" */
    columnEnd?: number | string;
    /** grid-row-start index (1-indexed) or "span N" */
    rowStart?: number | string;
    /** grid-row-end index (1-indexed) or "span N" */
    rowEnd?: number | string;
}

import type { LayoutNode } from '@termuijs/core';

export interface ColSpan {
    sm?: number;
    md?: number;
    lg?: number;
}

export interface ColOptions {
    span?: number | ColSpan;
    children?: Widget[];
}

/**
 * Col — a column in a responsive 12-column grid.
 */
export class Col extends Widget {
    private _spanConfig: number | ColSpan;

    constructor(style: Partial<Style> = {}, options: ColOptions = {}) {
        super(style);
        this._spanConfig = options.span ?? 12;

        if (options.children) {
            for (const child of options.children) {
                this.addChild(child);
            }
        }
    }

    applyBreakpoint(breakpoint: 'sm' | 'md' | 'lg'): void {
        let span = 12;
        if (typeof this._spanConfig === 'number') {
            span = this._spanConfig;
        } else {
            if (breakpoint === 'lg' && this._spanConfig.lg !== undefined) {
                span = this._spanConfig.lg;
            } else if ((breakpoint === 'lg' || breakpoint === 'md') && this._spanConfig.md !== undefined) {
                span = this._spanConfig.md;
            } else if (this._spanConfig.sm !== undefined) {
                span = this._spanConfig.sm;
            } else if (this._spanConfig.md !== undefined) {
                span = this._spanConfig.md;
            } else if (this._spanConfig.lg !== undefined) {
                span = this._spanConfig.lg;
            }
        }

        const newColEnd = `span ${span}`;
        if (this._style.gridColumnEnd !== newColEnd) {
            this._style.gridColumnEnd = newColEnd;
        }
    }

    protected _renderSelf(_screen: Screen): void {
        // Pure layout container
    }
}

/**
 * Grid — a true CSS-Grid-like layout container.
 * Also supports responsive Col children on a 12-column grid when columns are not explicitly set.
 */
export class Grid extends Widget {
    private readonly _areas: Map<string, GridAreaPlacement>;

    constructor(style: Partial<Style> = {}, options: GridOptions = {}) {
        // If no columns are provided, default to a 12-column grid for responsive `Col` usage.
        const defaultColumns = options.columns === undefined ? 12 : options.columns;
        const columns = typeof defaultColumns === 'number'
            ? Array(Math.max(1, defaultColumns)).fill('1fr').join(' ')
            : defaultColumns;
            
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

        this._areas = parseGridAreas(options.areas);
    }

    override getLayoutNode(): LayoutNode {
        let width = this.rect.width;
        if (width <= 0) {
            // @ts-ignore
            width = (typeof process !== 'undefined' && process.stdout?.columns) ? process.stdout.columns : 80;
        }

        let breakpoint: 'sm' | 'md' | 'lg' = 'sm';
        if (width >= 120) {
            breakpoint = 'lg';
        } else if (width >= 60) {
            breakpoint = 'md';
        }

        for (const child of this._children) {
            if (child instanceof Col) {
                child.applyBreakpoint(breakpoint);
            }
        }

        return super.getLayoutNode();
    }

    /** Add an item explicitly (alias for addChild) */
    addItem(widget: Widget): void {
        this.addChild(widget);
    }

    override addChild(child: Widget): void {
        this._applyNamedArea(child);
        super.addChild(child);
    }

    /** Return the resolved placement for a named grid area. */
    getAreaPlacement(area: string): GridAreaPlacement | undefined {
        const placement = this._areas.get(area);
        return placement ? { ...placement } : undefined;
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

    private _applyNamedArea(child: Widget): void {
        const area = getWidgetArea(child);
        if (!area) return;

        const placement = this._areas.get(area);
        if (!placement) {
            throw new Error(`Unknown grid area "${area}"`);
        }

        child.setStyle({
            gridColumnStart: placement.columnStart,
            gridColumnEnd: placement.columnEnd,
            gridRowStart: placement.rowStart,
            gridRowEnd: placement.rowEnd,
        });
    }
}

/**
 * GridItem — a child container that can define grid column/row spans or starts.
 */
export class GridItem extends Widget {
    readonly gridArea?: string;

    constructor(style: Partial<Style> = {}, options: GridItemOptions = {}) {
        const placement = options.area ? {} : {
            gridColumnStart: options.columnStart,
            gridColumnEnd: options.columnEnd,
            gridRowStart: options.rowStart,
            gridRowEnd: options.rowEnd,
        };

        super({
            ...placement,
            ...style
        });
        this.gridArea = options.area;
    }

    protected _renderSelf(_screen: Screen): void {
        // Pure layout container — no self-rendering needed.
    }
}
