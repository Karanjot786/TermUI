// ─────────────────────────────────────────────────────
// @termuijs/widgets — Table widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, type KeyEvent, type MouseEvent, styleToCellAttrs, stringWidth, truncate, wordWrap, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { type TableState } from './TableState.js';
import { computeVariableRange } from '../input/virtual-scroll.js';

export interface TableColumn {
    /** Column header label */
    header: string;
    /** Key to pull data from row objects */
    key: string;
    /** Fixed width (chars). If omitted, auto-distributes. */
    width?: number;
    /** Text alignment within the column */
    align?: 'left' | 'center' | 'right';
    /** Overflow behavior for cell content */
    overflow?: 'truncate' | 'wrap';
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
    /** Callback when a column header is activated to sort */
    onSort?: (colIndex: number, direction: 'asc' | 'desc') => void;
    /** Whether columns can be resized by dragging separators */
    resizable?: boolean;
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
 * - Virtualized scrolling
 * - Column sorting (internal or callback-driven)
 */
export class Table extends Widget {
    focusable = true;
    protected _columns: TableColumn[];
    protected _rows: TableRow[];
    protected _showHeader: boolean;
    protected _headerColor: Color;
    protected _stripe: boolean;
    protected _stripeColor: Color;
    protected _separator: string;
    protected _resizable: boolean;
    protected _columnWidths: number[] = [];
    private _lastWidth = -1;
    private _isDragging = false;
    private _dragColIndex = -1;
    
    private _state?: TableState;
    private _onStateChange?: (state: TableState) => void;
    private _selectedRow = 0;
    private _scrollOffset = 0;
    
    private _focusedHeaderIndex = 0;
    private _tableOnSort?: (colIndex: number, direction: 'asc' | 'desc') => void;
    private _sortState: { colIndex: number; direction: 'asc' | 'desc' } | null = null;

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
        this._resizable = options.resizable ?? false;
        this._state = state;
        this._onStateChange = onStateChange;
        this._tableOnSort = options.onSort;

        this.events.on('key', this.handleKey.bind(this));
        if (this._resizable) {
            this.events.on('mouse', this.handleMouse.bind(this));
        }
    }

    // ── Public API ────────────────────────────────────

    get selectedRow(): number { return this._selectedRow; }

    // ── Mutations ─────────────────────────────────────

    setRows(rows: TableRow[]): void {
        this._rows = rows;
        this._clampScroll();
        this.markDirty();
        this._pushState();
    }

    sortByColumn(columnKey: string, direction: 'asc' | 'desc' = 'asc'): void {
        const colIndex = this._columns.findIndex(c => c.key === columnKey);
        if (colIndex !== -1) {
            this._sortState = { colIndex, direction };
        }

        this._rows.sort((a, b) => {
            const cmp = String(a[columnKey] ?? '').localeCompare(String(b[columnKey] ?? ''));
            return direction === 'asc' ? cmp : -cmp;
        });

        this.markDirty();
    }

    toggleSort(colIndex: number): void {
        if (colIndex < 0 || colIndex >= this._columns.length) return;
        
        if (this._sortState?.colIndex === colIndex) {
            this._sortState.direction = this._sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this._sortState = { colIndex, direction: 'asc' };
        }
        
        if (this._tableOnSort) {
            this._tableOnSort(colIndex, this._sortState.direction);
        } else {
            // Fallback to internal sort if no callback provided
            const key = this._columns[colIndex].key;
            this.sortByColumn(key, this._sortState.direction);
        }
        this.markDirty();
    }

    // ── External state sync ───────────────────────────

    private _pushState(): void {
        if (this._state) {
            this._state.rows = this._rows;
            this._onStateChange?.(this._state);
        }
    }

    handleMouse(event: MouseEvent): void {
        if (!this._resizable) return;

        // Ensure we have computed widths at least once
        const rect = this._getContentRect();
        const sepWidth = stringWidth(this._separator);
        this._getColWidths(rect.width, sepWidth);

        if (event.type === 'mousedown') {
            const colIndex = this._findColumnBoundaryAt(event.x);
            if (colIndex !== -1) {
                this._isDragging = true;
                this._dragColIndex = colIndex;
            }
        } else if (event.type === 'mouseup' || event.type === 'dragend') {
            this._isDragging = false;
            this._dragColIndex = -1;
        } else if (event.type === 'drag' && this._isDragging) {
            let colStartX = rect.x;
            for (let i = 0; i < this._dragColIndex; i++) {
                colStartX += (this._columnWidths[i] ?? 0) + sepWidth;
            }
            
            const newWidth = Math.max(1, event.x - colStartX);
            this._columnWidths[this._dragColIndex] = newWidth;
            
            // To prevent table width from changing uncontrollably, we can subtract dx from the next column 
            // if there's enough space, but a simpler free-resizing UX works better for terminal tables
            this.markDirty();
        }
    }

    private _findColumnBoundaryAt(screenX: number): number {
        const rect = this._getContentRect();
        let cx = rect.x;
        const sepWidth = stringWidth(this._separator);
        
        for (let c = 0; c < this._columns.length - 1; c++) {
            cx += this._columnWidths[c] ?? 0;
            // The separator is from cx to cx + sepWidth
            if (screenX >= cx && screenX < cx + sepWidth) {
                return c;
            }
            cx += sepWidth;
        }
        return -1;
    }

    handleKey(event: KeyEvent): void {
        const minRow = this._showHeader ? -1 : 0;

        if (event.key === 'up') {
            this._selectedRow = Math.max(minRow, this._selectedRow - 1);
        }

        if (event.key === 'down') {
            this._selectedRow = Math.min(
                this._rows.length - 1,
                this._selectedRow + 1
            );
        }

        // Header Navigation Mode
        if (this._selectedRow === -1) {
            if (event.key === 'left') {
                this._focusedHeaderIndex = Math.max(0, this._focusedHeaderIndex - 1);
            }
            if (event.key === 'right') {
                this._focusedHeaderIndex = Math.min(this._columns.length - 1, this._focusedHeaderIndex + 1);
            }
            if (event.key === 'enter') {
                this.toggleSort(this._focusedHeaderIndex);
            }
        }

        this._clampScroll();
        this.markDirty();
    }
    
    protected _computeRowHeights(colWidths: number[]): number[] {
        return this._rows.map(row => {
            let maxLines = 1;
            for (let c = 0; c < this._columns.length; c++) {
                const col = this._columns[c];
                if (col.overflow === 'wrap') {
                    const text = String(row[col.key] ?? '');
                    const lines = wordWrap(text, colWidths[c]).split('\n').length;
                    if (lines > maxLines) maxLines = lines;
                }
            }
            return maxLines;
        });
    }

    private _clampScroll(): void {
        const rect = this._getContentRect();
        let visibleHeight = rect.height;
        if (this._showHeader) {
            visibleHeight -= 2; // header + separator
        }
        if (visibleHeight <= 0) { this._scrollOffset = 0; return; }

        const sepWidth = stringWidth(this._separator);
        const colWidths = this._getColWidths(rect.width, sepWidth);
        const sizes = this._computeRowHeights(colWidths);

        let selectedTop = 0;
        for (let i = 0; i < this._selectedRow; i++) {
            selectedTop += sizes[i] ?? 1;
        }
        const selectedBottom = selectedTop + (sizes[this._selectedRow] ?? 1);

        if (selectedTop < this._scrollOffset) {
            this._scrollOffset = selectedTop;
        } else if (selectedBottom > this._scrollOffset + visibleHeight) {
            this._scrollOffset = selectedBottom - visibleHeight;
        }
        this._scrollOffset = Math.max(0, this._scrollOffset);
    }

    // ── Rendering ─────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const sepWidth = stringWidth(this._separator);

        // Calculate column widths
        const colWidths = this._getColWidths(width, sepWidth);

        let headerOffset = 0;

        // Render header
        if (this._showHeader && headerOffset < height) {
            let cx = x;
            for (let c = 0; c < this._columns.length; c++) {
                const col = this._columns[c];
                
                let headerText = col.header;
                if (this._sortState?.colIndex === c) {
                    const ascIcon = caps.unicode ? ' ▲' : ' ^';
                    const descIcon = caps.unicode ? ' ▼' : ' v';
                    headerText += this._sortState.direction === 'asc' ? ascIcon : descIcon;
                }

                const cellText = this._alignText(headerText, colWidths[c], col.align ?? 'left');
                const isHeaderFocused = this.isFocused && this._selectedRow === -1 && this._focusedHeaderIndex === c;
                
                screen.writeString(cx, y + headerOffset, cellText, {
                    ...attrs,
                    fg: isHeaderFocused ? attrs.bg : this._headerColor,
                    bg: isHeaderFocused ? this._headerColor : attrs.bg,
                    bold: true,
                });
                cx += colWidths[c];
                if (c < this._columns.length - 1) {
                    screen.writeString(cx, y + headerOffset, this._separator, { ...attrs, dim: true });
                    cx += sepWidth;
                }
            }
            headerOffset++;

            // Header separator line
            if (headerOffset < height) {
                const sepLine = '─'.repeat(width);
                screen.writeString(x, y + headerOffset, sepLine, { ...attrs, dim: true });
                headerOffset++;
            }
        }

        const dataHeight = height - headerOffset;
        if (dataHeight <= 0) return;

        const sizes = this._computeRowHeights(colWidths);
        // Use the virtualization engine with variable heights
        const range = computeVariableRange(this._scrollOffset, dataHeight, sizes, 0);

        // Render data rows within the virtual range
        for (let r = range.start; r < range.end; r++) {
            const dataRow = this._rows[r];
            const isStripe = this._stripe && r % 2 === 1;
            const isSelected = r === this._selectedRow;
            
            let rowTop = 0;
            for (let i = 0; i < r; i++) {
                rowTop += sizes[i] ?? 1;
            }
            
            const rowHeight = sizes[r] ?? 1;

            for (let line = 0; line < rowHeight; line++) {
                const screenY = y + headerOffset + (rowTop - this._scrollOffset) + line;
                if (screenY < y + headerOffset || screenY >= y + height) continue;

                let cx = x;

                for (let c = 0; c < this._columns.length; c++) {
                    const col = this._columns[c];
                    const rawValue = String(dataRow[col.key] ?? '');
                    
                    let cellText = '';
                    if (col.overflow === 'wrap') {
                        const wrapped = wordWrap(rawValue, colWidths[c]).split('\n');
                        cellText = wrapped[line] ?? '';
                    } else {
                        cellText = line === 0 ? rawValue : '';
                    }
                    
                    const alignedText = this._alignText(cellText, colWidths[c], col.align ?? 'left');

                    screen.writeString(cx, screenY, alignedText, {
                        ...attrs,
                        bg: isSelected
                            ? { type: 'named', name: 'blue' }
                            : isStripe
                                ? this._stripeColor
                                : attrs.bg,
                    });
                    cx += colWidths[c];
                    if (c < this._columns.length - 1) {
                        screen.writeString(cx, screenY, this._separator, {
                            ...attrs,
                            dim: true,
                            bg: isStripe ? this._stripeColor : attrs.bg,
                        });
                        cx += sepWidth;
                    }
                }

                // Fill remaining width for stripe/selection highlight
                if (isStripe || isSelected) {
                    const rowBg = isSelected ? { type: 'named' as const, name: 'blue' as const } : this._stripeColor;
                    for (let fx = cx; fx < x + width; fx++) {
                        screen.setCell(fx, screenY, { char: ' ', bg: rowBg });
                    }
                }
            }
        }
    }

    private _getColWidths(rectWidth: number, sepWidth: number): number[] {
        if (!this._resizable) {
            return this._computeColumnWidths(Math.max(0, rectWidth - (this._columns.length - 1) * sepWidth));
        }
        
        if (this._columnWidths.length !== this._columns.length || this._lastWidth !== rectWidth) {
            this._columnWidths = this._computeColumnWidths(Math.max(0, rectWidth - (this._columns.length - 1) * sepWidth));
            this._lastWidth = rectWidth;
        }
        return this._columnWidths;
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
