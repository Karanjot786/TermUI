// ─────────────────────────────────────────────────────
// @termuijs/widgets — VirtualList (scroll virtualization)
//
// Renders only the visible rows of a large dataset.
// Supports keyboard navigation, custom item rendering,
// and variable-height items.
//
// Usage:
//   const list = new VirtualList({
//       totalItems: 100_000,
//       itemHeight: 1,
//       renderItem: (index) => `Row #${index}`,
//   });
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, truncate, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { computeRange } from './virtual-scroll.js';

export interface VirtualListOptions {
    /** Total number of items (the full dataset size) */
    totalItems: number;
    /** Height of each item in rows (default: 1) */
    itemHeight?: number;
    /** Render function: returns the string content for an item at a given index */
    renderItem: (index: number) => string;
    /** Style overrides */
    style?: Partial<Style>;
    /** Callback when an item is selected (Enter key) */
    onSelect?: (index: number) => void;
    /** Number of overscan rows to render above/below the viewport (default: 2) */
    overscan?: number;
    /** Show scrollbar (default: true) */
    showScrollbar?: boolean;
}

/**
 * VirtualList — a scroll-virtualized list widget.
 *
 * Only renders the items visible in the viewport plus
 * a small overscan buffer, enabling smooth scrolling
 * through datasets of any size.
 *
 * Performance:
 * - 100 items → renders ~26 rows
 * - 1,000,000 items → still renders only ~26 rows
 */
export class VirtualList extends Widget {
    private _totalItems: number;
    private _itemHeight: number;
    private _renderItem: (index: number) => string;
    private _onSelect?: (index: number) => void;
    private _selectedIndex = 0;
    private _scrollOffset = 0;
    private _overscan: number;
    private _showScrollbar: boolean;

    constructor(options: VirtualListOptions) {
        super({ border: 'single', ...options.style });
        this._totalItems = options.totalItems;
        this._itemHeight = options.itemHeight ?? 1;
        this._renderItem = options.renderItem;
        this._onSelect = options.onSelect;
        this._overscan = options.overscan ?? 2;
        this._showScrollbar = options.showScrollbar ?? true;
        this.focusable = true;
    }

    // ── Getters ──

    get totalItems(): number { return this._totalItems; }
    get selectedIndex(): number { return this._selectedIndex; }
    get scrollOffset(): number { return this._scrollOffset; }

    // ── Public API ──

    /** Update the total item count (e.g., after data refresh) */
    setTotalItems(count: number): void {
        this._totalItems = count;
        this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, count - 1));
        this._clampScroll();
        this.markDirty();
    }

    /** Update the render function (e.g., when data changes) */
    setRenderItem(fn: (index: number) => string): void {
        this._renderItem = fn;
        this.markDirty();
    }

    /** Move selection up by one */
    selectPrev(): void {
        if (this._selectedIndex > 0) {
            this._selectedIndex--;
            this._clampScroll();
            this.markDirty();
        }
    }

    /** Move selection down by one */
    selectNext(): void {
        if (this._selectedIndex < this._totalItems - 1) {
            this._selectedIndex++;
            this._clampScroll();
            this.markDirty();
        }
    }

    /** Jump to the first item */
    selectFirst(): void {
        this._selectedIndex = 0;
        this._clampScroll();
        this.markDirty();
    }

    /** Jump to the last item */
    selectLast(): void {
        this._selectedIndex = Math.max(0, this._totalItems - 1);
        this._clampScroll();
        this.markDirty();
    }

    /** Page up — move by viewport height */
    pageUp(): void {
        const rect = this._getContentRect();
        const pageSize = Math.floor(rect.height / this._itemHeight);
        this._selectedIndex = Math.max(0, this._selectedIndex - pageSize);
        this._clampScroll();
        this.markDirty();
    }

    /** Page down — move by viewport height */
    pageDown(): void {
        const rect = this._getContentRect();
        const pageSize = Math.floor(rect.height / this._itemHeight);
        this._selectedIndex = Math.min(this._totalItems - 1, this._selectedIndex + pageSize);
        this._clampScroll();
        this.markDirty();
    }

    /** Scroll to a specific index */
    scrollTo(index: number): void {
        this._selectedIndex = Math.max(0, Math.min(index, this._totalItems - 1));
        this._clampScroll();
        this.markDirty();
    }

    /** Confirm the current selection */
    confirm(): void {
        if (this._totalItems > 0) {
            this._onSelect?.(this._selectedIndex);
        }
    }

    // ── Rendering ──

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._totalItems === 0) return;

        const attrs = styleToCellAttrs(this._style);
        const visibleItemCount = Math.floor(height / this._itemHeight);

        // Calculate the visible window with overscan
        const { start: startIdx, end: endIdx } = computeRange(
            this._scrollOffset, visibleItemCount, this._totalItems, this._overscan,
        );

        // Content width (leave room for scrollbar)
        const contentWidth = this._showScrollbar && this._totalItems > visibleItemCount
            ? width - 1
            : width;

        // Only render items in the visible window
        for (let idx = startIdx; idx < endIdx; idx++) {
            const rowY = y + (idx - this._scrollOffset) * this._itemHeight;

            // Skip if outside the visible rect
            if (rowY < y || rowY >= y + height) continue;

            const isSelected = idx === this._selectedIndex;

            // Get the item content
            let content: string;
            try {
                content = this._renderItem(idx);
            } catch {
                content = `[Error: item ${idx}]`;
            }

            // Add selection prefix
            const prefix = isSelected ? (caps.unicode ? '▸ ' : '> ') : '  ';
            let line = prefix + content;
            line = truncate(line, contentWidth);

            // Style
            const cellStyle = {
                ...attrs,
                bold: isSelected,
                inverse: isSelected && this.isFocused,
            };

            screen.writeString(x, rowY, line, cellStyle);

            // Fill rest of line for inverse highlight
            if (isSelected && this.isFocused) {
                const remaining = contentWidth - stringWidth(line);
                for (let c = 0; c < remaining; c++) {
                    screen.setCell(x + stringWidth(line) + c, rowY, { char: ' ', ...cellStyle });
                }
            }
        }

        // Scrollbar
        if (this._showScrollbar && this._totalItems > visibleItemCount) {
            const scrollbarX = x + width - 1;
            const totalPages = this._totalItems - visibleItemCount;
            const scrollRatio = totalPages > 0 ? this._scrollOffset / totalPages : 0;
            const thumbPos = Math.floor(scrollRatio * (height - 1));
            const thumbChar = caps.unicode ? '█' : '#';
            const trackChar = caps.unicode ? '░' : '|';

            for (let r = 0; r < height; r++) {
                const scrollChar = r === thumbPos ? thumbChar : trackChar;
                screen.setCell(scrollbarX, y + r, { char: scrollChar, ...attrs, dim: r !== thumbPos });
            }
        }
    }

    // ── Internal ──

    private _clampScroll(): void {
        const rect = this._getContentRect();
        const visibleHeight = Math.floor(rect.height / this._itemHeight);
        if (visibleHeight <= 0) { this._scrollOffset = 0; return; }

        // Keep selected item visible
        if (this._selectedIndex < this._scrollOffset) {
            this._scrollOffset = this._selectedIndex;
        }
        if (this._selectedIndex >= this._scrollOffset + visibleHeight) {
            this._scrollOffset = this._selectedIndex - visibleHeight + 1;
        }

        // Clamp scroll offset
        this._scrollOffset = Math.max(0, Math.min(this._scrollOffset, this._totalItems - visibleHeight));
    }
}
