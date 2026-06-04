// ─────────────────────────────────────────────────────────────────────────────
// @termuijs/widgets — DataGrid widget (2D virtualization + sorting)
//
// Renders tabular data with only visible rows and columns drawn.
// Supports keyboard navigation, column sorting, and ASCII fallback borders.
//
// Usage:
//   const grid = new DataGrid({
//       columns: [{ key: 'name', header: 'Name', width: 20, sortable: true }],
//       rows: [{ name: 'Alice' }, { name: 'Bob' }],
//   });
// ─────────────────────────────────────────────────────────────────────────────

import { type Screen, type Style, type KeyEvent, styleToCellAttrs, stringWidth, truncate, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface DataGridColumn {
    /** Unique key matching a property in each row object */
    key: string;
    /** Display header text */
    header: string;
    /** Fixed column width in characters */
    width: number;
    /** Allow clicking/pressing enter on header to sort (default: false) */
    sortable?: boolean;
}

export type SortDirection = 'asc' | 'desc' | 'none';
export type DataGridRow = Record<string, string | number>;

export interface DataGridOptions {
    /** Column definitions */
    columns: DataGridColumn[];
    /** Row data: array of key→value records */
    rows: DataGridRow[];
    /** Style overrides */
    style?: Partial<Style>;
    /** Show header row (default: true) */
    showHeader?: boolean;
    /** Callback fired when sort changes */
    onSort?: (key: string, direction: SortDirection) => void;
}

/**
 * DataGrid – a 2D-virtualized table widget.
 *
 * Only the rows and columns that fit inside the current terminal
 * dimensions are rendered. Supports arrow-key navigation and
 * column sorting.
 */
export class DataGrid extends Widget {
    private _columns: DataGridColumn[];
    private _rows: DataGridRow[];
    private _showHeader: boolean;
    private _onSort?: (key: string, direction: SortDirection) => void;

    private _rowOffset = 0;
    private _colOffset = 0;
    private _selectedRow = 0;
    private _selectedCol = 0;
    private _sortKey: string | null = null;
    private _sortDir: SortDirection = 'none';

    constructor(options: DataGridOptions) {
        super({ border: 'single', ...options.style });
        this._columns = options.columns;
        this._rows = options.rows;
        this._showHeader = options.showHeader ?? true;
        this._onSort = options.onSort;
        this.focusable = true;
    }

    get selectedRow(): number { return this._selectedRow; }
    get selectedCol(): number { return this._selectedCol; }
    get sortKey(): string | null { return this._sortKey; }
    get sortDirection(): SortDirection { return this._sortDir; }

    setRows(rows: DataGridRow[]): void {
        this._rows = rows;
        this._selectedRow = Math.min(this._selectedRow, Math.max(0, rows.length - 1));
        this._clampScroll();
        this.markDirty();
    }

    setColumns(columns: DataGridColumn[]): void {
        this._columns = columns;
        this._selectedCol = Math.min(this._selectedCol, Math.max(0, columns.length - 1));
        this._colOffset = 0;
        this.markDirty();
    }

    selectPrev(): void {
        if (this._selectedRow > 0) {
            this._selectedRow--;
            this._clampScroll();
            this.markDirty();
        }
    }

    selectNext(): void {
        if (this._selectedRow < this._rows.length - 1) {
            this._selectedRow++;
            this._clampScroll();
            this.markDirty();
        }
    }

    selectLeft(): void {
        if (this._selectedCol > 0) {
            this._selectedCol--;
            this._clampColScroll();
            this.markDirty();
        }
    }

    selectRight(): void {
        if (this._selectedCol < this._columns.length - 1) {
            this._selectedCol++;
            this._clampColScroll();
            this.markDirty();
        }
    }

    toggleSort(): void {
        const column = this._columns[this._selectedCol];
        if (!column || !column.sortable) return;

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
        switch (event.key) {
            case 'down':
                this.selectNext();
                break;
            case 'up':
                this.selectPrev();
                break;
            case 'left':
                this.selectLeft();
                break;
            case 'right':
                this.selectRight();
                break;
            case 'enter':
            case 'return':
                this.toggleSort();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const sortedRows = this._getSortedRows();
        const visibleColumns = this._getVisibleColumns(width);
        const vertical = caps.unicode ? '│' : '|';
        const rowHeight = this._showHeader ? Math.max(0, height - 1) : height;

        const xOffset = x;
        let drawY = y;

        if (this._showHeader && height > 0) {
            let cx = xOffset;
            for (const { column, width: colWidth, separator } of visibleColumns) {
                const cellWidth = separator ? Math.max(0, colWidth - 1) : colWidth;
                const headerText = truncate(column.header, cellWidth);
                screen.writeString(cx, drawY, headerText, { ...attrs, bold: true });

                if (separator) {
                    screen.writeString(cx + cellWidth, drawY, vertical, attrs);
                }

                cx += colWidth;
            }
            drawY++;
        }

        if (this._rows.length === 0) {
            if (drawY < y + height) {
                const message = 'no data';
                screen.writeString(xOffset, drawY, truncate(message, width), attrs);
            }
            return;
        }

        const visibleRows = sortedRows.slice(this._rowOffset, this._rowOffset + rowHeight);
        for (let rowIndex = 0; rowIndex < visibleRows.length && drawY < y + height; rowIndex++, drawY++) {
            const row = visibleRows[rowIndex];
            let cx = xOffset;
            const isSelected = this._selectedRow === this._rowOffset + rowIndex;
            for (const { column, width: colWidth, separator } of visibleColumns) {
                const cellWidth = separator ? Math.max(0, colWidth - 1) : colWidth;
                const rawValue = String(row[column.key] ?? '');
                const cellText = truncate(rawValue, cellWidth);
                screen.writeString(cx, drawY, cellText, {
                    ...attrs,
                    bold: isSelected,
                    bg: isSelected ? { type: 'named', name: 'brightBlack' } : attrs.bg,
                });

                if (separator) {
                    screen.writeString(cx + cellWidth, drawY, vertical, attrs);
                }

                cx += colWidth;
            }
        }
    }

    private _getSortedRows(): DataGridRow[] {
        if (this._sortDir === 'none' || this._sortKey === null) {
            return this._rows;
        }

        const key = this._sortKey;
        const dir = this._sortDir;
        return [...this._rows].sort((a, b) => {
            const left  = a[key] ?? '';
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

    private _getVisibleColumns(totalWidth: number): Array<{ column: DataGridColumn; width: number; separator: boolean }> {
        const visible: Array<{ column: DataGridColumn; width: number; separator: boolean }> = [];
        let remaining = totalWidth;

        for (let index = this._colOffset; index < this._columns.length; index++) {
            const column = this._columns[index];
            const needsSeparator = index < this._columns.length - 1;
            const reserved = column.width + (needsSeparator ? 1 : 0);
            if (reserved > remaining) break;
            visible.push({ column, width: column.width + (needsSeparator ? 1 : 0), separator: needsSeparator });
            remaining -= reserved;
        }

        return visible;
    }

    private _clampScroll(): void {
        const visibleRows = Math.max(0, this._getVisibleRowCount());

        if (this._selectedRow < this._rowOffset) {
            this._rowOffset = this._selectedRow;
        } else if (this._selectedRow >= this._rowOffset + visibleRows) {
            this._rowOffset = this._selectedRow - visibleRows + 1;
        }

        this._rowOffset = Math.max(0, Math.min(this._rowOffset, Math.max(0, this._rows.length - visibleRows)));
    }

    private _clampColScroll(): void {
        const visibleCols = this._getVisibleColumns(this._getContentRect().width).length;

        if (this._selectedCol < this._colOffset) {
            this._colOffset = this._selectedCol;
        } else if (this._selectedCol >= this._colOffset + visibleCols) {
            this._colOffset = this._selectedCol - visibleCols + 1;
        }

        this._colOffset = Math.max(0, this._colOffset);
    }

    private _getVisibleRowCount(): number {
        const height = this._getContentRect().height;
        return this._showHeader ? Math.max(0, height - 1) : height;
    }
}

/** JSX-friendly alias for the DataGrid class widget */
export { DataGrid as DataGridView } from './DataGrid.js';
