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

import { type Cell, type Screen, type Style, styleToCellAttrs, truncate, stringWidth, caps, prefersReducedMotion } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { computeRange } from './virtual-scroll.js';
import { calculateSpringScroll, type ScrollSpringState } from '../scroll.js';

export interface VirtualListOptions {
    /** Total number of items (the full dataset size) */
    totalItems: number;
    /** Height of each item in rows (default: 1) */
    itemHeight?: number;
    /** Fixed height of each item, alias for itemHeight */
    fixedItemHeight?: number;
    /** Whether to memoize the layout and bypass Flexbox recalculation on scroll frames (default: true) */
    memoizeLayout?: boolean;
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
    /** Enable spring scroll animations (default: true, respects prefersReducedMotion) */
    springScroll?: boolean;
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
    
    private _memoizeLayout: boolean;
    private _isScrolling = false;
    private _lastContentWidth = 0;
    private _renderCache = new Map<number, {
        line: string;
        cellStyle:  Partial<Omit<Cell, 'char' | 'width'>>;
        isSelected: boolean;
        isFocused: boolean;
    }>();

    // ── Spring scroll animation state ──
    private _springScroll: boolean;
    private _targetScrollOffset = 0;
    private _spring: ScrollSpringState = { position: 0, velocity: 0 };
    private _lastUpdateTime = 0;
    private _isAnimating = false;
    private _animationTimeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(options: VirtualListOptions) {
        super({ border: 'single', ...options.style });
        this._totalItems = options.totalItems;
        const resolvedItemHeight = options.fixedItemHeight ?? options.itemHeight ?? 1;
        if (!Number.isFinite(resolvedItemHeight) || resolvedItemHeight <= 0) {
            throw new Error('VirtualList itemHeight must be a positive number');
        }
        this._itemHeight = resolvedItemHeight;
        this._memoizeLayout = options.memoizeLayout ?? true;
        this._renderItem = options.renderItem;
        this._onSelect = options.onSelect;
        this._overscan = options.overscan ?? 2;
        this._showScrollbar = options.showScrollbar ?? true;
        this._springScroll = options.springScroll ?? !prefersReducedMotion();
        this.focusable = true;
    }

    // ── Getters ──

    get totalItems(): number { return this._totalItems; }
    get selectedIndex(): number { return this._selectedIndex; }
    get scrollOffset(): number { return this._scrollOffset; }

    // ── Public API ──

    /** Update the total item count (e.g., after data refresh) */
    setTotalItems(count: number): void {
        this._clearCache();
        this._totalItems = count;
        this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, count - 1));
        this._clampScroll();
        this.markDirty();
    }

    /** Update the render function (e.g., when data changes) */
    setRenderItem(fn: (index: number) => string): void {
        this._clearCache();
        this._renderItem = fn;
        this.markDirty();
    }

    /** Move selection up by one */
    selectPrev(): void {
        if (this._selectedIndex > 0) {
            this._runScrollAction(() => {
                this._selectedIndex--;
                this._clampScroll();
                this.markDirty();
            });
        }
    }

    /** Move selection down by one */
    selectNext(): void {
        if (this._selectedIndex < this._totalItems - 1) {
            this._runScrollAction(() => {
                this._selectedIndex++;
                this._clampScroll();
                this.markDirty();
            });
        }
    }

    /** Jump to the first item */
    selectFirst(): void {
        this._runScrollAction(() => {
            this._selectedIndex = 0;
            this._clampScroll();
            this.markDirty();
        });
    }

    /** Jump to the last item */
    selectLast(): void {
        this._runScrollAction(() => {
            this._selectedIndex = Math.max(0, this._totalItems - 1);
            this._clampScroll();
            this.markDirty();
        });
    }

    /** Page up — move by viewport height */
    pageUp(): void {
        this._runScrollAction(() => {
            const rect = this._getContentRect();
            const pageSize = Math.floor(rect.height / this._itemHeight);
            this._selectedIndex = Math.max(0, this._selectedIndex - pageSize);
            this._clampScroll();
            this.markDirty();
        });
    }

    /** Page down — move by viewport height */
    pageDown(): void {
        this._runScrollAction(() => {
            const rect = this._getContentRect();
            const pageSize = Math.floor(rect.height / this._itemHeight);
            this._selectedIndex = Math.min(this._totalItems - 1, this._selectedIndex + pageSize);
            this._clampScroll();
            this.markDirty();
        });
    }

    /** Scroll to a specific index */
    scrollTo(index: number): void {
        this._runScrollAction(() => {
            this._selectedIndex = Math.max(0, Math.min(index, this._totalItems - 1));
            this._clampScroll();
            this.markDirty();
        });
    }

    /** Confirm the current selection */
    confirm(): void {
        if (this._totalItems > 0) {
            this._onSelect?.(this._selectedIndex);
        }
    }

    override setStyle(style: Partial<Style>): void {
        this._clearCache();
        super.setStyle(style);
    }

    override markDirty(): void {
        if (this._memoizeLayout && this._isScrolling) {
            this._markDirtyNoLayout();
            return;
        }
        super.markDirty();
    }

    override destroy(): void {
        if (this._animationTimeoutId !== null) {
            clearTimeout(this._animationTimeoutId);
            this._animationTimeoutId = null;
        }
        super.destroy();
    }

    // ── Rendering ──

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._totalItems === 0) return;

        // Update spring animation if active
        if (this._springScroll && this._isAnimating) {
            const now = performance.now();
            let dt = this._lastUpdateTime > 0 ? (now - this._lastUpdateTime) / 1000 : 1 / 60;
            if (dt <= 0 || dt > 0.1) {
                dt = 1 / 60;
            }
            this._lastUpdateTime = now;

            const nextSpring = calculateSpringScroll(this._spring, this._targetScrollOffset, dt);
            this._spring = nextSpring;
            this._scrollOffset = Math.round(nextSpring.position);

            const posDiff = Math.abs(nextSpring.position - this._targetScrollOffset);
            const velDiff = Math.abs(nextSpring.velocity);

            if (posDiff < 0.05 && velDiff < 0.05) {
                this._spring.position = this._targetScrollOffset;
                this._spring.velocity = 0;
                this._scrollOffset = this._targetScrollOffset;
                this._isAnimating = false;
                this._lastUpdateTime = 0;
                if (this._animationTimeoutId !== null) {
                    clearTimeout(this._animationTimeoutId);
                    this._animationTimeoutId = null;
                }
            } else {
                // Request next frame update
                if (this._animationTimeoutId === null) {
                    this._animationTimeoutId = setTimeout(() => {
                        this._animationTimeoutId = null;
                        this.markDirty();
                    }, 16);
                }
            }
        }

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

        if (this._lastContentWidth !== contentWidth) {
            this._clearCache();
            this._lastContentWidth = contentWidth;
        }

        // Only render items in the visible window
        for (let idx = startIdx; idx < endIdx; idx++) {
            const rowY = y + (idx - this._scrollOffset) * this._itemHeight;

            // Skip if outside the visible rect
            if (rowY < y || rowY >= y + height) continue;

            const isSelected = idx === this._selectedIndex;
            const isFocused = this.isFocused;

            let cached = this._renderCache.get(idx);
            if (!cached || cached.isSelected !== isSelected || cached.isFocused !== isFocused) {
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
                    inverse: isSelected && isFocused,
                };

                cached = { line, cellStyle, isSelected, isFocused };
                this._renderCache.set(idx, cached);
            }

            screen.writeString(x, rowY, cached.line, cached.cellStyle);

            // Fill rest of line for inverse highlight
            if (isSelected && isFocused) {
                const remaining = contentWidth - stringWidth(cached.line);
                for (let c = 0; c < remaining; c++) {
                    screen.setCell(x + stringWidth(cached.line) + c, rowY, { char: ' ', ...cached.cellStyle });
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

    private _clearCache(): void {
        this._renderCache.clear();
    }

    private _runScrollAction(action: () => void): void {
        this._isScrolling = true;
        try {
            action();
        } finally {
            this._isScrolling = false;
        }
    }

    // ── Internal ──

    private _clampScroll(): void {
        const rect = this._getContentRect();
        const visibleHeight = Math.floor(rect.height / this._itemHeight);
        if (visibleHeight <= 0) {
            this._scrollOffset = 0;
            this._targetScrollOffset = 0;
            return;
        }

        // Keep selected item visible
        let target = this._targetScrollOffset;
        if (this._selectedIndex < target) {
            target = this._selectedIndex;
        }
        if (this._selectedIndex >= target + visibleHeight) {
            target = this._selectedIndex - visibleHeight + 1;
        }

        // Clamp scroll offset
        target = Math.max(0, Math.min(target, this._totalItems - visibleHeight));
        this._targetScrollOffset = target;

        if (!this._springScroll) {
            this._scrollOffset = target;
            this._spring.position = target;
            this._spring.velocity = 0;
        } else {
            if (!this._isAnimating && this._scrollOffset !== target) {
                this._lastUpdateTime = performance.now();
                this._isAnimating = true;
                this.markDirty();
            }
        }
    }
}
