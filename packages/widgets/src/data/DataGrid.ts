// ─────────────────────────────────────────────────────────────────────────────
// @termuijs/widgets — DataGrid widget
//
// A table with sort indicators and a filter row. Extends Table and adds:
// - `s` key cycles sort on the selected column (none → asc → desc → none)
// - `/` opens a filter row; typing narrows displayed rows
// - `escape` closes the filter row and clears the filter
// - Sort indicators: ▲ / ▼ (Unicode) or ^ / v (ASCII) appended to headers
// ─────────────────────────────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type KeyEvent,
    styleToCellAttrs,
    stringWidth,
    truncate,
    caps,
} from '@termuijs/core';
import { Table, type TableColumn, type TableRow, type TableOptions } from './Table.js';

export type SortDirection = 'asc' | 'desc' | 'none';

export interface DataGridColumn extends TableColumn {
    /** Whether the column can be sorted. Default: true. */
    sortable?: boolean;
}

export type DataGridRow = TableRow;

export interface DataGridOptions extends TableOptions {
    /** Callback fired when sort changes. */
    onSort?: (key: string, direction: SortDirection) => void;
    /** Callback fired when the filter changes. */
    onFilter?: (filter: string) => void;
}

export class DataGrid extends Table {
    private _onSort?: (key: string, direction: SortDirection) => void;
    private _onFilter?: (filter: string) => void;

    private _sortKey: string | null = null;
    private _sortDir: SortDirection = 'none';
    private _filter = '';
    private _filterOpen = false;
    private _selectedCol = 0;

    focusable = true;

    constructor(
        columns: DataGridColumn[],
        rows: DataGridRow[],
        style: Partial<Style> = {},
        options: DataGridOptions = {},
    ) {
        const normalizedColumns: DataGridColumn[] = columns.map(c => ({
            ...c,
            sortable: c.sortable ?? true,
        }));
        super(normalizedColumns, rows, style, options);
        this._onSort = options.onSort;
        this._onFilter = options.onFilter;
    }

    // ── Public API ──────────────────────────────────

    get sortKey(): string | null { return this._sortKey; }
    get sortDirection(): SortDirection { return this._sortDir; }
    get filter(): string { return this._filter; }
    get filterOpen(): boolean { return this._filterOpen; }
    get selectedColumn(): number { return this._selectedCol; }

    setSelectedColumn(col: number): void {
        if (col < 0 || col >= this._columns.length) return;
        this._selectedCol = col;
        this.markDirty();
    }

    setFilter(filter: string): void {
        this._filter = filter;
        this._filterOpen = true;
        this._onFilter?.(filter);
        this.markDirty();
    }

    clearFilter(): void {
        if (this._filter === '' && !this._filterOpen) return;
        this._filter = '';
        this._filterOpen = false;
        this._onFilter?.('');
        this.markDirty();
    }

    cycleSort(): void {
        const column = this._columns[this._selectedCol] as DataGridColumn | undefined;
        if (!column || column.sortable === false) return;

        if (this._sortKey !== column.key) {
            this._sortKey = column.key;
            this._sortDir = 'asc';
        } else if (this._sortDir === 'asc') {
            this._sortDir = 'desc';
        } else if (this._sortDir === 'desc') {
            this._sortDir = 'none';
            this._sortKey = null;
        } else {
            this._sortDir = 'asc';
        }

        this._onSort?.(column.key, this._sortDir);
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        // While filter is open, capture printable keys + escape + backspace.
        if (this._filterOpen) {
            switch (event.key) {
                case 'escape':
                    this.clearFilter();
                    return;
                case 'backspace':
                    if (this._filter.length > 0) {
                        this.setFilter(this._filter.slice(0, -1));
                    }
                    return;
                default:
                    if (
                        event.key.length === 1
                        && !event.ctrl
                        && !event.alt
                    ) {
                        this.setFilter(this._filter + event.key);
                    }
                    return;
            }
        }

        // Normal mode: navigation + sort + filter
        switch (event.key) {
            case 's':
            case 'S':
                if (!event.ctrl && !event.alt) this.cycleSort();
                break;
        
            case '/':
                this._filterOpen = true;
                this.markDirty();
                break;
        
            case 'escape':
                this.clearFilter();
                break;
        
            case 'left':
                this.setSelectedColumn(this._selectedCol - 1);
                break;
        
            case 'right':
                this.setSelectedColumn(this._selectedCol + 1);
                break;
        
            default:
                super.handleKey(event);
                break;
        }
    }

    // ── Rendering ───────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const sepWidth = stringWidth(this._separator);
        const sortIndicator = (dir: SortDirection): string => {
            if (dir === 'asc') return caps.unicode ? ' \u25B2' : ' ^';
            if (dir === 'desc') return caps.unicode ? ' \u25BC' : ' v';
            return '';
        };

        const filterRowHeight = this._filterOpen ? 1 : 0;
        const filterY = y;
        const tableY = y + filterRowHeight;
        const tableHeight = Math.max(0, height - filterRowHeight);

        if (this._filterOpen) {
            const filterText = `/${this._filter}`;
            screen.writeString(x, filterY, truncate(filterText, width), { ...attrs, dim: true });
        }

        if (tableHeight <= 0) return;

        // Available width for headers and data
        const usableWidth = width - (this._columns.length - 1) * sepWidth;
        const colWidths = this._computeColumnWidths(usableWidth);

        let row = 0;

        if (this._showHeader && row < tableHeight) {
            let cx = x;
            for (let c = 0; c < this._columns.length; c++) {
                const col = this._columns[c] as DataGridColumn;
                const isSortKey = this._sortKey === col.key;
                const indicator = isSortKey ? sortIndicator(this._sortDir) : '';
                const indicatorStripped = stringWidth(indicator);
                const cellWidth = colWidths[c] ?? 0;
                const headerWidth = Math.max(0, cellWidth - indicatorStripped);
                const headerText = this._alignText(col.header, headerWidth, col.align ?? 'left');

                screen.writeString(cx, tableY + row, headerText, {
                    ...attrs,
                    bold: true,
                    underline: c === this._selectedCol,
                });

                if (indicator) {
                    screen.writeString(cx + headerWidth, tableY + row, indicator, {
                        ...attrs,
                        bold: true,
                    });
                }

                cx += cellWidth;
                if (c < this._columns.length - 1) {
                    screen.writeString(cx, tableY + row, this._separator, { ...attrs, dim: true });
                    cx += sepWidth;
                }
            }
            row++;

            // Header separator line
            if (row < tableHeight) {
                const sepLine = (caps.unicode ? '\u2500' : '-').repeat(width);
                screen.writeString(x, tableY + row, sepLine, { ...attrs, dim: true });
                row++;
            }
        }

        const dataRows = this._getVisibleRows();
        for (let r = 0; r < dataRows.length && row < tableHeight; r++) {
            const dataRow = dataRows[r];
            if (!dataRow) continue;
            const isStripe = this._stripe && r % 2 === 1;
            let cx = x;

            for (let c = 0; c < this._columns.length; c++) {
                const col = this._columns[c];
                const cellWidth = colWidths[c] ?? 0;
                const rawValue = String(dataRow[col.key] ?? '');
                const cellText = this._alignText(rawValue, cellWidth, col.align ?? 'left');

                screen.writeString(cx, tableY + row, cellText, {
                    ...attrs,
                    bg: isStripe ? this._stripeColor : attrs.bg,
                });
                cx += cellWidth;
                if (c < this._columns.length - 1) {
                    screen.writeString(cx, tableY + row, this._separator, {
                        ...attrs,
                        dim: true,
                        bg: isStripe ? this._stripeColor : attrs.bg,
                    });
                    cx += sepWidth;
                }
            }

            if (isStripe) {
                for (let fx = cx; fx < x + width; fx++) {
                    screen.setCell(fx, tableY + row, { char: ' ', bg: this._stripeColor });
                }
            }

            row++;
        }
    }

    private _getVisibleRows(): DataGridRow[] {
        let rows = [...this._rows];
        if (this._filter.length > 0) {
            const needle = this._filter.toLowerCase();
            rows = rows.filter(r =>
                this._columns.some(c => {
                    const v = r[c.key];
                    return v !== undefined && String(v).toLowerCase().includes(needle);
                }),
            );
        }
        if (this._sortDir !== 'none' && this._sortKey !== null) {
            const key = this._sortKey;
            const dir = this._sortDir;
            rows.sort((a, b) => {
                const left = a[key] ?? '';
                const right = b[key] ?? '';
                if (typeof left === 'number' && typeof right === 'number') {
                    return dir === 'asc' ? left - right : right - left;
                }
                const l = String(left);
                const r = String(right);
                if (l === r) return 0;
                return dir === 'asc' ? (l > r ? 1 : -1) : (l < r ? 1 : -1);
            });
        }
        return rows;
    }
}
