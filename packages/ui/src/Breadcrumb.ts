// ─────────────────────────────────────────────────────
// @termuijs/ui — Breadcrumb component
//
// A horizontal path navigator. Left/right arrows move
// focus; Enter fires the focused item's onSelect.
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    type Style,
    type Color,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
    stringWidth,
    truncate,
} from '@termuijs/core';

export interface BreadcrumbItem {
    label: string;
    onSelect?: () => void;
}

export interface BreadcrumbOptions {
    items: BreadcrumbItem[];
    currentColor?: Color;
    inactiveColor?: Color;
    separatorColor?: Color;
}

export class Breadcrumb extends Widget {
    private _items: BreadcrumbItem[];
    private _focusedIndex = 0;
    private _currentColor: Color;
    private _inactiveColor: Color;
    private _separatorColor: Color;

    focusable = true;

    constructor(options: BreadcrumbOptions) {
        super(mergeStyles(defaultStyle(), { height: 1 }));
        this._items = options.items;
        this._currentColor = options.currentColor ?? { type: 'named', name: 'cyan' };
        this._inactiveColor = options.inactiveColor ?? { type: 'named', name: 'brightBlack' };
        this._separatorColor = options.separatorColor ?? { type: 'named', name: 'brightBlack' };
    }

    get items(): ReadonlyArray<BreadcrumbItem> { return this._items; }
    get focusedIndex(): number { return this._focusedIndex; }

    setItems(items: BreadcrumbItem[]): void {
        this._items = items;
        this._focusedIndex = Math.min(this._focusedIndex, Math.max(0, items.length - 1));
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (this._items.length === 0) return;
        switch (event.key) {
            case 'right':
                this._focusedIndex = (this._focusedIndex + 1) % this._items.length;
                this.markDirty();
                break;
            case 'left':
                this._focusedIndex = (this._focusedIndex - 1 + this._items.length) % this._items.length;
                this.markDirty();
                break;
            case 'enter':
            case 'return':
                this._items[this._focusedIndex]?.onSelect?.();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._getContentRect();
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        const sep = caps.unicode ? '›' : '>';
        const sepWithSpaces = ` ${sep} `;

        let cx = x;
        for (let i = 0; i < this._items.length; i++) {
            const item = this._items[i];
            if (!item) continue;
            const isLast = i === this._items.length - 1;
            const isFocused = i === this._focusedIndex;

            const itemWidth = stringWidth(item.label);
            if (cx + itemWidth > x + width) {
                const remaining = x + width - cx;
                screen.writeString(cx, y, truncate(item.label, remaining), attrs);
                return;
            }

            const itemAttrs = isLast
                ? { ...attrs, fg: this._currentColor, bold: true }
                : isFocused
                    ? { ...attrs, fg: this._currentColor, underline: true }
                    : { ...attrs, fg: this._inactiveColor };

            screen.writeString(cx, y, item.label, itemAttrs);
            cx += itemWidth;

            if (!isLast) {
                const sepWidth = stringWidth(sepWithSpaces);
                if (cx + sepWidth > x + width) return;
                screen.writeString(cx, y, sepWithSpaces, { ...attrs, fg: this._separatorColor, dim: true });
                cx += sepWidth;
            }
        }
    }
}
