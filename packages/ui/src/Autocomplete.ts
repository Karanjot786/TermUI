// ─────────────────────────────────────────────────────
// @termuijs/ui — Autocomplete widget
// ─────────────────────────────────────────────────────

import {
    type Style,
    type Screen,
    type KeyEvent,
    type Color,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
    truncate,
    stringWidth
} from '@termuijs/core';
import { Widget } from '@termuijs/widgets';

export interface AutocompleteOptions {
    /** List of search suggestions / candidates */
    items: string[];
    /** Callback when an item is selected or submitted */
    onSelect?: (value: string) => void;
    /** Callback when the query text changes */
    onChange?: (value: string) => void;
    /** Custom filter function to override default lowercase startsWith matching */
    filter?: (query: string, item: string) => boolean;
    /** Maximum number of suggestions to display in dropdown. Default: 5 */
    maxSuggestions?: number;
    /** Placeholder text when query is empty */
    placeholder?: string;
    /** Highlight color for the selected suggestion */
    highlightColor?: Color;
}

const defaultFilter = (query: string, item: string) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = item.toLowerCase();
    let qIdx = 0;
    for (let i = 0; i < t.length; i++) {
        if (t[i] === q[qIdx]) qIdx++;
        if (qIdx === q.length) return true;
    }
    return false;
};

export class Autocomplete extends Widget {
    private _items: string[] = [];
    private _query = '';
    private _isOpen = false;
    private _selectedIndex = -1;
    private _onSelect?: (value: string) => void;
    private _onChange?: (value: string) => void;
    private _filter: (query: string, item: string) => boolean;
    private _maxSuggestions: number;
    private _placeholder: string;
    private _highlightColor: Color;

    constructor(style: Partial<Style> = {}, options: AutocompleteOptions = { items: [] }) {
        super(mergeStyles(defaultStyle(), { height: 6, focusRingStyle: 'none', ...style }));
        this._items = options.items ?? [];
        this._onSelect = options.onSelect;
        this._onChange = options.onChange;
        this._filter = options.filter ?? defaultFilter;
        this._maxSuggestions = options.maxSuggestions ?? 5;
        this._placeholder = options.placeholder ?? '';
        this._highlightColor = options.highlightColor ?? { type: 'named', name: 'cyan' };
        this.focusable = true;
    }

    get query(): string {
        return this._query;
    }

    set query(value: string) {
        this._query = value;
        this._selectedIndex = -1;
        this.markDirty();
    }

    get items(): string[] {
        return this._items;
    }

    setItems(items: string[]): void {
        this._items = items;
        this._selectedIndex = -1;
        this.markDirty();
    }

    private get _filteredItems(): string[] {
        return this._items.filter(item => this._filter(this._query, item));
    }

    public handleKey(event: KeyEvent): void {
        const filtered = this._filteredItems;
        const key = event.key;

        if (key === 'down' || key === 'tab') {
            this._isOpen = true;
            if (filtered.length > 0) {
                this._selectedIndex = (this._selectedIndex + 1) % filtered.length;
            }
            this.markDirty();
            return;
        }

        if (key === 'up') {
            this._isOpen = true;
            if (filtered.length > 0) {
                if (this._selectedIndex <= 0) {
                    this._selectedIndex = filtered.length - 1;
                } else {
                    this._selectedIndex--;
                }
            }
            this.markDirty();
            return;
        }

        if (key === 'escape') {
            this._isOpen = false;
            this._selectedIndex = -1;
            this.markDirty();
            return;
        }

        if (key === 'enter') {
            if (this._isOpen && this._selectedIndex >= 0 && this._selectedIndex < filtered.length) {
                const selected = filtered[this._selectedIndex];
                this._query = selected;
                this._onChange?.(this._query);
                this._onSelect?.(selected);
                this._isOpen = false;
                this._selectedIndex = -1;
            } else {
                this._onSelect?.(this._query);
            }
            this.markDirty();
            return;
        }

        if (key === 'backspace') {
            if (this._query.length > 0) {
                this._query = this._query.slice(0, -1);
                this._isOpen = true;
                this._selectedIndex = -1;
                this._onChange?.(this._query);
            }
            this.markDirty();
            return;
        }

        if (key.length === 1 && !event.ctrl && !event.alt) {
            this._query += key;
            this._isOpen = true;
            this._selectedIndex = -1;
            this._onChange?.(this._query);
            this.markDirty();
            return;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const pointer = caps.unicode ? '➔' : '>';
        const pointerStr = pointer + ' ';
        const prefixWidth = stringWidth(pointerStr);

        if (this._query.length === 0 && !this.isFocused) {
            const displayPlaceholder = truncate(this._placeholder, width - prefixWidth);
            screen.writeString(x, y, pointerStr + displayPlaceholder, { ...attrs, dim: true });
        } else {
            const displayQuery = truncate(this._query, width - prefixWidth);
            screen.writeString(x, y, pointerStr + displayQuery, attrs);

            if (this.isFocused) {
                const cursorX = x + prefixWidth + stringWidth(displayQuery);
                if (cursorX < x + width) {
                    screen.setCell(cursorX, y, {
                        char: ' ',
                        ...attrs,
                        inverse: true,
                    });
                }
            }
        }

        const filtered = this._filteredItems;
        if (this._isOpen && this.isFocused && filtered.length > 0) {
            const renderCount = Math.min(filtered.length, height - 1, this._maxSuggestions);
            for (let i = 0; i < renderCount; i++) {
                const item = filtered[i];
                const isSelected = i === this._selectedIndex;
                const rowY = y + 1 + i;
                if (rowY >= y + height) break;

                const itemText = truncate(item, width - 2);
                const prefix = isSelected ? (caps.unicode ? '● ' : '* ') : '  ';
                const itemAttrs = isSelected
                    ? { ...attrs, fg: this._highlightColor, bold: true }
                    : attrs;

                screen.writeString(x, rowY, prefix + itemText, itemAttrs);
            }
        }
    }
}