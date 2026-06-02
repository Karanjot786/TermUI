// ─────────────────────────────────────────────────────
// @termuijs/widgets — Table widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, type KeyEvent, styleToCellAttrs, stringWidth, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { type VirtualRowsState } from './hooks/useVirtualRows.js';

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
    /** Virtual rows state object from useVirtualRows */
    virtualRows?: VirtualRowsState;
    /** Total number of rows in the table (used in virtualization) */
    totalRows?: number;
    /** Callback when a row is selected or confirmed */
    onSelect?: (rowIndex: number) => void;
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
 * - Row virtualization (via useVirtualRows hook)
 * - Keyboard navigation (Up/Down/Home/End/PageUp/PageDown/Enter)
 * - Scrollbar indicator
 */
export class Table extends Widget {
    private _columns: TableColumn[];
    private _rows: TableRow[];
    private _showHeader: boolean;
    private _headerColor: Color;
    private _stripe: boolean;
    private _stripeColor: Color;
    private _separator: string;
    private _virtualRows?: VirtualRowsState;
    private _onSelect?: (rowIndex: number) => void;
    private _selectedIndex = 0;
    private _scrollOffset = 0;

    constructor(
        columns: (TableColumn | string)[],
        rows: TableRow[],
        style: Partial<Style> = {},
        options: TableOptions = {},
    ) {
        super(style);
        this._columns = (columns ?? []).map(col =>
            typeof col === 'string' ? { header: col, key: col } : col
        );
        this._rows = rows ?? [];
        this._showHeader = options.showHeader ?? true;
        this._headerColor = options.headerColor ?? { type: 'named', name: 'cyan' };
        this._stripe = options.stripe ?? true;
        this._stripeColor = options.stripeColor ?? { type: 'named', name: 'brightBlack' };
        this._separator = options.separator ?? ' │ ';
        this._virtualRows = options.virtualRows;
        this._onSelect = options.onSelect;
        this.focusable = true;

        this.events.on('key', (event) => {
            this.handleKey(event);
        });
    }

    // ── Selection & Scroll Getters/Setters ──

    get totalRows(): number {
        if (this._virtualRows) {
            return this._virtualRows.totalRows;
        }
        return this._rows.length;
    }

    get selectedIndex(): number {
        if (this._virtualRows) {
            return this._virtualRows.selectedIndex;
        }
        return this._selectedIndex;
    }

    setSelectedIndex(index: number): void {
        const total = this.totalRows;
        const clamped = total <= 0 ? 0 : Math.max(0, Math.min(index, total - 1));
        if (this._virtualRows) {
            this._virtualRows.setSelectedIndex(clamped);
        } else {
            this._selectedIndex = clamped;
        }
        this._clampScrollForIndex(clamped);
        this.markDirty();
        this._onSelect?.(clamped);
    }

    get scrollOffset(): number {
        if (this._virtualRows) {
            return this._virtualRows.scrollOffset;
        }
        return this._scrollOffset;
    }

    setScrollOffset(offset: number): void {
        const maxScroll = Math.max(0, this.totalRows - this._getDataHeight());
        const clamped = Math.max(0, Math.min(offset, maxScroll));
        if (this._virtualRows) {
            this._virtualRows.setScrollOffset(clamped);
        } else {
            this._scrollOffset = clamped;
        }
        this.markDirty();
    }

    // ── Public Navigation API ──

    selectPrev(): void {
        this.setSelectedIndex(this.selectedIndex - 1);
    }

    selectNext(): void {
        this.setSelectedIndex(this.selectedIndex + 1);
    }

    selectFirst(): void {
        this.setSelectedIndex(0);
    }

    selectLast(): void {
        this.setSelectedIndex(this.totalRows - 1);
    }

    pageUp(): void {
        const pageSize = this._getDataHeight();
        this.setSelectedIndex(this.selectedIndex - pageSize);
    }

    pageDown(): void {
        const pageSize = this._getDataHeight();
        this.setSelectedIndex(this.selectedIndex + pageSize);
    }

    confirm(): void {
        if (this.totalRows > 0) {
            this._onSelect?.(this.selectedIndex);
        }
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':
            case 'k':
                this.selectPrev();
                break;
            case 'down':
            case 'j':
                this.selectNext();
                break;
            case 'home':
                this.selectFirst();
                break;
            case 'end':
                this.selectLast();
                break;
            case 'pageup':
                this.pageUp();
                break;
            case 'pagedown':
                this.pageDown();
                break;
            case 'enter':
            case 'space':
                this.confirm();
                break;
        }
    }

    setRows(rows: TableRow[]): void {
        this._rows = rows;
        this.setSelectedIndex(Math.min(this.selectedIndex, Math.max(0, this.totalRows - 1)));
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        this._clampScrollForIndex(this.selectedIndex);

        const attrs = styleToCellAttrs(this._style);
        const sepWidth = stringWidth(this._separator);
        const dataHeight = this._getDataHeight();

        const showScrollbar = this.totalRows > dataHeight;
        const contentWidth = showScrollbar ? width - 1 : width;

        // Calculate column widths
        const colWidths = this._computeColumnWidths(
            contentWidth - (this._columns.length - 1) * sepWidth,
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
                const sepLine = '─'.repeat(contentWidth);
                screen.writeString(x, y + row, sepLine, { ...attrs, dim: true });
                row++;
            }
        }

        // Render data rows
        const startRow = this.scrollOffset;
        const endRow = Math.min(this.totalRows, startRow + dataHeight);

        for (let r = startRow; r < endRow && row < height; r++) {
            const isSelected = r === this.selectedIndex && this.isFocused;
            const isStripe = this._stripe && r % 2 === 1;
            let cx = x;

            const cellStyle = isSelected
                ? {
                    ...attrs,
                    bg: { type: 'named' as const, name: 'blue' as const },
                    bold: true,
                  }
                : isStripe
                ? { ...attrs, bg: this._stripeColor }
                : attrs;

            for (let c = 0; c < this._columns.length; c++) {
                const col = this._columns[c];
                
                let rawValue = '';
                if (this._virtualRows) {
                    try {
                        rawValue = this._virtualRows.getCell(r, c);
                    } catch {
                        rawValue = `[Error]`;
                    }
                } else {
                    const dataRow = this._rows[r];
                    rawValue = dataRow ? String(dataRow[col.key] ?? '') : '';
                }

                const cellText = this._alignText(rawValue, colWidths[c], col.align ?? 'left');

                screen.writeString(cx, y + row, cellText, cellStyle);
                cx += colWidths[c];
                if (c < this._columns.length - 1) {
                    screen.writeString(cx, y + row, this._separator, {
                        ...cellStyle,
                        dim: !isSelected,
                    });
                    cx += sepWidth;
                }
            }

            // Fill remaining width for stripe/selection highlight
            if (isSelected || isStripe) {
                const bg = isSelected ? ({ type: 'named', name: 'blue' as const } as Color) : this._stripeColor;
                for (let fx = cx; fx < x + contentWidth; fx++) {
                    screen.setCell(fx, y + row, { char: ' ', bg });
                }
            }

            row++;
        }

        // Render scrollbar
        if (showScrollbar && dataHeight > 0) {
            const scrollbarX = x + width - 1;
            const totalPages = this.totalRows - dataHeight;
            const scrollRatio = totalPages > 0 ? this.scrollOffset / totalPages : 0;
            const thumbPos = Math.floor(scrollRatio * (dataHeight - 1));
            
            const headerLines = this._showHeader ? 2 : 0;
            
            const thumbChar = '█';
            const trackChar = '░';

            for (let r = 0; r < dataHeight; r++) {
                const scrollChar = r === thumbPos ? thumbChar : trackChar;
                screen.setCell(scrollbarX, y + headerLines + r, {
                    char: scrollChar,
                    ...attrs,
                    dim: r !== thumbPos,
                });
            }
        }
    }

    private _getDataHeight(): number {
        const rect = this._getContentRect();
        const headerLines = this._showHeader ? 2 : 0;
        return Math.max(0, rect.height - headerLines);
    }

    private _clampScrollForIndex(selected: number): void {
        const dataHeight = this._getDataHeight();
        if (dataHeight <= 0) {
            this.setScrollOffset(0);
            return;
        }

        let offset = this.scrollOffset;

        if (selected < offset) {
            offset = selected;
        } else if (selected >= offset + dataHeight) {
            offset = selected - dataHeight + 1;
        }

        this.setScrollOffset(offset);
    }

    private _computeColumnWidths(totalWidth: number): number[] {
        const fixedCols = this._columns.filter(c => c.width !== undefined);
        const flexCols = this._columns.filter(c => c.width === undefined);

        let usedWidth = fixedCols.reduce((sum, c) => sum + (c.width ?? 0), 0);
        const remainingWidth = Math.max(0, totalWidth - usedWidth);
        const flexWidth = flexCols.length > 0 ? Math.floor(remainingWidth / flexCols.length) : 0;

        return this._columns.map(c => c.width ?? flexWidth);
    }

    private _alignText(text: string, width: number, align: 'left' | 'center' | 'right'): string {
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

