// ─────────────────────────────────────────────────────
// @termuijs/widgets — Table widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { type TableState } from './TableState.js';

export interface TableColumn {
    /** Column header label */
    header: string;
    /** Key to pull data from row objects */
    key: string;
    /** Fixed width (chars). If omitted, auto-distributes. */
    width?: number;
    /** Text alignment within the column */
    align?: 'left' | 'center' | 'right';
}

export type TableRow = Record<string, string | number>;

export interface TableOptions {
    /** Whether to show the header row */
    showHeader?: boolean;
    /** Color for the header row */
    headerColor?: Color;
    /** Whether rows are zebra-striped */
    stripe?: boolean;
    /** Stripe color */
    stripeColor?: Color;
    /** Column separator character */
    separator?: string;
}

export interface TableProps {
    columns: TableColumn[];
    rows?: TableRow[];
    style?: Partial<Style>;
    options?: TableOptions;
    /** External state object – if provided, Table syncs rows through it */
    state?: TableState;
    /** Called whenever rows change via setRows */
    onStateChange?: (state: TableState) => void;
}

/**
 * Table — renders tabular data with columns, headers, and optional zebra-striping.
 *
 * Supports:
 * - Auto-width column distribution
 * - Fixed and percentage widths
 * - Header styling
 * - Zebra striping
 * - Text alignment per column
 * - Truncation for overflow
 * - External state via `state` prop and `useTableState` hook
 */
export class Table extends Widget {
    protected _columns: TableColumn[];
    protected _rows: TableRow[];
    protected _showHeader: boolean;
    protected _headerColor: Color;
    protected _stripe: boolean;
    protected _stripeColor: Color;
    protected _separator: string;
    private _state?: TableState;
    private _onStateChange?: (state: TableState) => void;
    private _selectedRow = 0;
    private _sortColumn = '';

    constructor(
        columnsOrProps: TableColumn[] | TableProps,
        rows: TableRow[] = [],
        style: Partial<Style> = {},
        options: TableOptions = {},
    ) {
        let columns: TableColumn[];
        let state: TableState | undefined;
        let onStateChange: ((s: TableState) => void) | undefined;

        if (Array.isArray(columnsOrProps)) {
            columns = columnsOrProps;
        } else {
            const props = columnsOrProps as TableProps;
            columns = props.columns;
            rows = props.rows ?? [];
            style = props.style ?? style;
            options = props.options ?? options;
            state = props.state;
            onStateChange = props.onStateChange;
        }

        super(style);
        this._columns = columns;
        this._rows = rows;
        this._showHeader = options.showHeader ?? true;
        this._headerColor = options.headerColor ?? { type: 'named', name: 'cyan' };
        this._stripe = options.stripe ?? true;
        this._stripeColor = options.stripeColor ?? { type: 'named', name: 'brightBlack' };
        this._separator = options.separator ?? ' │ ';
        this._state = state;
        this._onStateChange = onStateChange;
    }

    // ── Mutations ─────────────────────────────────────

    setRows(rows: TableRow[]): void {
        this._rows = rows;
        this.markDirty();
        this._pushState();
    }

    sortByColumn(columnKey: string): void {
    this._sortColumn = columnKey;

    this._rows.sort((a, b) =>
        String(a[columnKey] ?? '').localeCompare(
            String(b[columnKey] ?? '')
        )
    );

    this.markDirty();
}

    // ── External state sync ───────────────────────────

    private _pushState(): void {
        if (this._state) {
            this._state.rows = this._rows;
            this._onStateChange?.(this._state);
        }
    }

    handleKey(key: string): void {
    if (key === 'up') {
        this._selectedRow = Math.max(0, this._selectedRow - 1);
    }

    if (key === 'down') {
        this._selectedRow = Math.min(
            this._rows.length - 1,
            this._selectedRow + 1
        );
    }

    this.markDirty();
}

    // ── Rendering ─────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const sepWidth = stringWidth(this._separator);

        // Calculate column widths
        const colWidths = this._computeColumnWidths(
            width - (this._columns.length - 1) * sepWidth,
        );

        let row = 0;

        // Render header
        if (this._showHeader && row < height) {
            let cx = x;
            for (let c = 0; c < this._columns.length; c++) {
                const col = this._columns[c];
                const cellText = this._alignText(col.header, colWidths[c], col.align ?? 'left');
                screen.writeString(cx, y + row, cellText, {
                    ...attrs,
                    fg: this._headerColor,
                    bold: true,
                });
                cx += colWidths[c];
                if (c < this._columns.length - 1) {
                    screen.writeString(cx, y + row, this._separator, { ...attrs, dim: true });
                    cx += sepWidth;
                }
            }
            row++;

            // Header separator line
            if (row < height) {
                const sepLine = '─'.repeat(width);
                screen.writeString(x, y + row, sepLine, { ...attrs, dim: true });
                row++;
            }
        }

        // Render data rows
        for (let r = 0; r < this._rows.length && row < height; r++) {
            const dataRow = this._rows[r];
            const isStripe = this._stripe && r % 2 === 1;
            const isSelected = r === this._selectedRow;
            let cx = x;

            for (let c = 0; c < this._columns.length; c++) {
                const col = this._columns[c];
                const rawValue = String(dataRow[col.key] ?? '');
                const cellText = this._alignText(rawValue, colWidths[c], col.align ?? 'left');

                screen.writeString(cx, y + row, cellText, {
    ...attrs,
    bg: isSelected
        ? { type: 'named', name: 'blue' }
        : isStripe
            ? this._stripeColor
            : attrs.bg,
});
                cx += colWidths[c];
                if (c < this._columns.length - 1) {
                    screen.writeString(cx, y + row, this._separator, {
                        ...attrs,
                        dim: true,
                        bg: isStripe ? this._stripeColor : attrs.bg,
                    });
                    cx += sepWidth;
                }
            }

            // Fill remaining width for stripe
            if (isStripe) {
                for (let fx = cx; fx < x + width; fx++) {
                    screen.setCell(fx, y + row, { char: ' ', bg: this._stripeColor });
                }
            }

            row++;
        }
    }

    protected _computeColumnWidths(totalWidth: number): number[] {
        const fixedCols = this._columns.filter(c => c.width !== undefined);
        const flexCols = this._columns.filter(c => c.width === undefined);

        const usedWidth = fixedCols.reduce((sum, c) => sum + (c.width ?? 0), 0);
        const remainingWidth = Math.max(0, totalWidth - usedWidth);
        const flexWidth = flexCols.length > 0 ? Math.floor(remainingWidth / flexCols.length) : 0;

        return this._columns.map(c => c.width ?? flexWidth);
    }

    protected _alignText(text: string, width: number, align: 'left' | 'center' | 'right'): string {
        const truncated = truncate(text, width);
        const textWidth = stringWidth(truncated);
        const pad = Math.max(0, width - textWidth);

        switch (align) {
            case 'right':
                return ' '.repeat(pad) + truncated;
            case 'center': {
                const left = Math.floor(pad / 2);
                const right = pad - left;
                return ' '.repeat(left) + truncated + ' '.repeat(right);
            }
            case 'left':
            default:
                return truncated + ' '.repeat(pad);
        }
    }
}
