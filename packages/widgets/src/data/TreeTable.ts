// ─────────────────────────────────────────────────────
// @termuijs/widgets — TreeTable widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type Color,
    type KeyEvent,
    styleToCellAttrs,
    stringWidth,
    truncate,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface TreeTableColumn {
    /** Column header label */
    header: string;
    /** Key to pull data from row objects */
    key: string;
    /** Fixed width (chars). If omitted, auto-distributes. */
    width?: number;
    /** Text alignment within the column */
    align?: 'left' | 'center' | 'right';
}

export interface TreeTableRow {
    children?: TreeTableRow[];
    expanded?: boolean;
    [key: string]: unknown;
}

export interface TreeTableOptions {
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
    /** Indentation per depth (default 2) */
    indent?: number;
    /** Callback when a row is selected */
    onSelect?: (row: TreeTableRow) => void;
}

interface VisibleEntry {
    row: TreeTableRow;
    depth: number;
}

/**
 * TreeTable — combines Tree expand/collapse with Table columns.
 *
 * Supports:
 * - Nested rows with column alignment
 * - Expand/collapse with arrows or Enter
 * - Keyboard navigation
 * - Unicode and ASCII symbols
 * - Zebra striping
 * - Header styling
 */
export class TreeTable extends Widget {
    private _columns: TreeTableColumn[];
    private _rows: TreeTableRow[];
    private _showHeader: boolean;
    private _headerColor: Color;
    private _stripe: boolean;
    private _stripeColor: Color;
    private _separator: string;
    private _indent: number;
    private _onSelect?: (row: TreeTableRow) => void;
    protected _selectedIndex = 0;
    protected _scrollOffset = 0;
    protected _visibleRows: VisibleEntry[] = [];

    constructor(
        columns: TreeTableColumn[],
        rows: TreeTableRow[],
        style: Partial<Style> = {},
        options: TreeTableOptions = {},
    ) {
        super(style);
        this._columns = columns;
        this._rows = rows;
        this._showHeader = options.showHeader ?? true;
        this._headerColor = options.headerColor ?? { type: 'named', name: 'cyan' };
        this._stripe = options.stripe ?? true;
        this._stripeColor = options.stripeColor ?? { type: 'named', name: 'brightBlack' };
        this._separator = options.separator ?? ' │ ';
        this._indent = options.indent ?? 2;
        this._onSelect = options.onSelect;
        this.focusable = true;
        this._buildVisibleRows();
    }

    // ── Public API ─────────────────────────────────────

    get selectedIndex(): number { return this._selectedIndex; }

    get selectedRow(): TreeTableRow | undefined {
        return this._visibleRows[this._selectedIndex]?.row;
    }

    setRows(rows: TreeTableRow[]): void {
        this._rows = rows;
        this._selectedIndex = 0;
        this._scrollOffset = 0;
        this._buildVisibleRows();
        this.markDirty();
    }

    /** Move cursor up one visible row */
    movePrev(): void {
        if (this._selectedIndex > 0) {
            this._selectedIndex--;
            this._clampScroll();
            this.markDirty();
            this._onSelect?.(this._visibleRows[this._selectedIndex].row);
        }
    }

    /** Move cursor down one visible row */
    moveNext(): void {
        if (this._selectedIndex < this._visibleRows.length - 1) {
            this._selectedIndex++;
            this._clampScroll();
            this.markDirty();
            this._onSelect?.(this._visibleRows[this._selectedIndex].row);
        }
    }

    /** Go to first visible row */
    moveFirst(): void {
        this._selectedIndex = 0;
        this._clampScroll();
        this.markDirty();
        this._onSelect?.(this._visibleRows[this._selectedIndex].row);
    }

    /** Go to last visible row */
    moveLast(): void {
        if (this._visibleRows.length > 0) {
            this._selectedIndex = this._visibleRows.length - 1;
            this._clampScroll();
            this.markDirty();
            this._onSelect?.(this._visibleRows[this._selectedIndex].row);
        }
    }

    /** Expand the selected row (if it has children and is collapsed) */
    expand(): void {
        const entry = this._visibleRows[this._selectedIndex];
        if (!entry) return;
        const row = entry.row;
        if (_isParent(row) && !row.expanded) {
            row.expanded = true;
            this._buildVisibleRows();
            this.markDirty();
        }
    }

    /** Collapse the selected row, or move to parent if already collapsed/leaf */
    collapse(): void {
        const entry = this._visibleRows[this._selectedIndex];
        if (!entry) return;
        const row = entry.row;

        if (_isParent(row) && row.expanded) {
            row.expanded = false;
            this._buildVisibleRows();
            this._clampScroll();
            this.markDirty();
        }
    }

    /** Toggle expand/collapse */
    toggle(): void {
        const entry = this._visibleRows[this._selectedIndex];
        if (!entry) return;
        const row = entry.row;

        if (_isParent(row)) {
            row.expanded = !row.expanded;
            this._buildVisibleRows();
            this._clampScroll();
            this.markDirty();
        } else {
            this._onSelect?.(row);
        }
    }

    /**
     * Handle a key event. Call this from your app's key-routing logic
     * when this widget is focused.
     */
    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':
            case 'k':
                this.movePrev();
                break;
            case 'down':
            case 'j':
                this.moveNext();
                break;
            case 'enter':
            case 'space':
                this.toggle();
                break;
            case 'left':
            case 'h':
                this.collapse();
                break;
            case 'right':
            case 'l':
                this.expand();
                break;
            case 'home':
                this.moveFirst();
                break;
            case 'end':
                this.moveLast();
                break;
        }
    }

    // ── Rendering ──────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const sepWidth = stringWidth(this._separator);
        const useUnicode = caps.unicode;

        const collapsedChevron = useUnicode ? '▶ ' : '> ';
        const expandedChevron = useUnicode ? '▼ ' : 'v ';
        const leafPrefix = useUnicode ? '• ' : '* ';

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

        // Render visible data rows
        const visibleCount = Math.min(this._visibleRows.length - this._scrollOffset, height - row);
        for (let i = 0; i < visibleCount; i++) {
            const entryIdx = this._scrollOffset + i;
            const entry = this._visibleRows[entryIdx];
            const { row: dataRow, depth } = entry;
            const isSelected = entryIdx === this._selectedIndex && this.isFocused;
            const isStripe = this._stripe && i % 2 === 1;

            const indentStr = ' '.repeat(this._indent * depth);
            let prefix: string;
            if (_isParent(dataRow)) {
                prefix = dataRow.expanded ? expandedChevron : collapsedChevron;
            } else {
                prefix = leafPrefix;
            }
            const fullPrefix = indentStr + prefix;

            let cx = x;
            for (let c = 0; c < this._columns.length; c++) {
                const col = this._columns[c];
                const rawValue = String(dataRow[col.key] ?? '');
                const cellContent = c === 0 ? fullPrefix + rawValue : rawValue;
                const cellText = this._alignText(cellContent, colWidths[c], col.align ?? 'left');

                const cellStyle = isSelected
                    ? {
                        ...attrs,
                        bg: { type: 'named' as const, name: 'blue' as const },
                        bold: true,
                    }
                    : isStripe
                    ? { ...attrs, bg: this._stripeColor }
                    : attrs;

                screen.writeString(cx, y + row, cellText, cellStyle);
                cx += colWidths[c];
                if (c < this._columns.length - 1) {
                    screen.writeString(cx, y + row, this._separator, {
                        ...attrs,
                        dim: true,
                        bg: isSelected ? { type: 'named', name: 'blue' } : isStripe ? this._stripeColor : attrs.bg,
                    });
                    cx += sepWidth;
                }
            }

            // Fill remaining width for stripe/selection
            if (isSelected || isStripe) {
                const bg: Color = isSelected ? { type: 'named', name: 'blue' as const } : this._stripeColor;
                for (let fx = cx; fx < x + width; fx++) {
                    screen.setCell(fx, y + row, { char: ' ', bg });
                }
            }

            row++;
        }
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

    private _buildVisibleRows(): void {
        this._visibleRows = [];
        _collectVisible(this._rows, 0, this._visibleRows);
    }

    private _clampScroll(): void {
        const rect = this._getContentRect();
        const headerOffset = this._showHeader ? 2 : 0;
        const visibleHeight = Math.max(1, rect.height - headerOffset);

        if (this._selectedIndex < this._scrollOffset) {
            this._scrollOffset = this._selectedIndex;
        }
        if (this._selectedIndex >= this._scrollOffset + visibleHeight) {
            this._scrollOffset = this._selectedIndex - visibleHeight + 1;
        }
        this._scrollOffset = Math.max(0, this._scrollOffset);
    }
}

function _isParent(row: TreeTableRow): boolean {
    return Array.isArray(row.children) && row.children.length > 0;
}

function _collectVisible(
    rows: TreeTableRow[],
    depth: number,
    out: VisibleEntry[],
): void {
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        out.push({ row, depth });
        if (_isParent(row) && row.expanded) {
            _collectVisible(row.children!, depth + 1, out);
        }
    }
}
