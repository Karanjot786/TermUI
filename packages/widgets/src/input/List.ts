// ─────────────────────────────────────────────────────
// @termuijs/widgets — List widget (selectable)
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, stringWidth, truncate, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { type ListState } from '../data/ListState.js';

export interface ListItem {
    label: string;
    value: string;
    disabled?: boolean;
}

export interface ListProps {
    items?: ListItem[];
    style?: Partial<Style>;
    onSelect?: (item: ListItem, index: number) => void;
    /** External state object – if provided, List reads/writes selection through it */
    state?: ListState;
    /** Called whenever selection or scroll changes */
    onStateChange?: (state: ListState) => void;
    /** Message to display when the list is empty */
    emptyMessage?: string;
    /** Allow items to be reordered via moveItem() */
    reorderable?: boolean;
}


/**
 * List — a scrollable, selectable list of items.
 *
 * Supports:
 * - Keyboard navigation (up/down/Home/End)
 * - Scrolling when items exceed visible height
 * - Custom item styling
 * - Disabled items
 * - External state via `state` prop and `useListState` hook
 */
export class List extends Widget {
    private _items: ListItem[];
    private _selectedIndex = 0;
    private _scrollOffset = 0;
    private _onSelect?: (item: ListItem, index: number) => void;
    private _state?: ListState;
    private _onStateChange?: (state: ListState) => void;
    private _emptyMessage?: string;
    private _reorderable = false;

    constructor(
        itemsOrProps: ListItem[] | ListProps,
        style: Partial<Style> = {},
        onSelect?: (item: ListItem, index: number) => void,
    ) {
        super({ border: 'single', ...style });

        if (Array.isArray(itemsOrProps)) {
            this._items = itemsOrProps;
            this._onSelect = onSelect;
        } else {
            const props = itemsOrProps as ListProps;
            this._items = props.items ?? [];
            this._state = props.state;
            this._onStateChange = props.onStateChange;
            this._onSelect = props.onSelect ?? onSelect;
            this._emptyMessage = props.emptyMessage;
            this._reorderable = props.reorderable ?? false;

            // Initialise from external state if provided
            if (props.state) {
                this._selectedIndex = props.state.selectedIndex;
                this._scrollOffset = props.state.scrollOffset;
            }
        }

        this.focusable = true;
    }

    // ── Getters ───────────────────────────────────────

    get selectedIndex(): number { return this._selectedIndex; }
    get selectedItem(): ListItem | undefined { return this._items[this._selectedIndex]; }

    // ── Mutations ─────────────────────────────────────

    setItems(items: ListItem[]): void {
        this._items = items;
        if (this._selectedIndex >= items.length) {
            this._selectedIndex = Math.max(0, items.length - 1);
        }
        this._clampScroll();
        this.markDirty();
        this._pushState();
    }

    /** Move an item to a new position (requires reorderable: true). */
    moveItem(from: number, to: number): void {
        if (!this._reorderable) return;
        if (from < 0 || to < 0 || from >= this._items.length || to >= this._items.length) return;
        const [item] = this._items.splice(from, 1);
        if (item) {
            this._items.splice(to, 0, item);
            this._selectedIndex = to;
            this._clampScroll();
            this.markDirty();
            this._pushState();
        }
    }

    /** Move selection up */
    selectPrev(): void {
        let next = this._selectedIndex - 1;
        while (next >= 0 && this._items[next]?.disabled) next--;
        if (next >= 0) {
            this._selectedIndex = next;
            this._clampScroll();
            this.markDirty();
            this._pushState();
        }
    }

    /** Move selection down */
    selectNext(): void {
        let next = this._selectedIndex + 1;
        while (next < this._items.length && this._items[next]?.disabled) next++;
        if (next < this._items.length) {
            this._selectedIndex = next;
            this._clampScroll();
            this.markDirty();
            this._pushState();
        }
    }

    /** Confirm the current selection */
    confirm(): void {
        const item = this._items[this._selectedIndex];
        if (item && !item.disabled) {
            this._onSelect?.(item, this._selectedIndex);
        }
    }

    // ── External state sync ───────────────────────────

    private _pushState(): void {
        if (this._state) {
            this._state.items = this._items;
            this._state.selectedIndex = this._selectedIndex;
            this._state.scrollOffset = this._scrollOffset;
            this._onStateChange?.(this._state);
        }
    }

    // ── Rendering ─────────────────────────────────────

       protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Render Empty State if no items exist
        if (this._items.length === 0 && this._emptyMessage) {
            const msg = truncate(this._emptyMessage, width);
            const msgX = x + Math.floor((width - stringWidth(msg)) / 2);
            const msgY = y + Math.floor(height / 2);
            screen.writeString(msgX, msgY, msg, { ...attrs, dim: true });
            return;
        }

        const visibleCount = Math.min(this._items.length - this._scrollOffset, height);

        for (let i = 0; i < visibleCount; i++) {
            const itemIdx = this._scrollOffset + i;
            const item = this._items[itemIdx];
            const isSelected = itemIdx === this._selectedIndex;

            // Compose the line
            const prefix = isSelected ? (caps.unicode ? '▸ ' : '> ') : '  ';
            let line = prefix + item.label;
            line = truncate(line, width);

            // Style
            const cellStyle = {
                ...attrs,
                bold: isSelected,
                dim: item.disabled ?? false,
                inverse: isSelected && this.isFocused,
            };

            screen.writeString(x, y + i, line, cellStyle);

            // Fill rest of line for inverse highlight
            if (isSelected && this.isFocused) {
                const remaining = width - stringWidth(line);
                for (let c = 0; c < remaining; c++) {
                    screen.setCell(x + stringWidth(line) + c, y + i, { char: ' ', ...cellStyle });
                }
            }
        }

        // Scrollbar indicator
        if (this._items.length > height) {
            const scrollRatio = this._scrollOffset / (this._items.length - height);
            const scrollPos = Math.floor(scrollRatio * (height - 1));
            for (let r = 0; r < height; r++) {
                const scrollChar = r === scrollPos ? (caps.unicode ? '█' : '#') : (caps.unicode ? '░' : '-');
                screen.setCell(x + width - 1, y + r, { char: scrollChar, ...attrs, dim: true });
            }
        }
    }

    private _clampScroll(): void {
        const rect = this._getContentRect();
        const visibleHeight = rect.height;
        if (visibleHeight <= 0) { this._scrollOffset = 0; return; }

        if (this._selectedIndex < this._scrollOffset) {
            this._scrollOffset = this._selectedIndex;
        }
        if (this._selectedIndex >= this._scrollOffset + visibleHeight) {
            this._scrollOffset = this._selectedIndex - visibleHeight + 1;
        }
    }
}
