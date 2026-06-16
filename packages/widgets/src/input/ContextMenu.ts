// ─────────────────────────────────────────────────────
// @termuijs/widgets — ContextMenu widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, stringWidth, truncate, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface ContextMenuItem {
    label: string;
    value: string;
    disabled?: boolean;
}

/**
 * ContextMenu — a floating menu widget positioned at absolute coordinates.
 *
 * Supports:
 * - Keyboard navigation (up/down arrows)
 * - Selection confirmation (Enter)
 * - Menu dismissal (Escape)
 * - Callback on item selection
 * - Disabled items
 * - Safe ASCII fallback for unicode icons
 */
export class ContextMenu extends Widget {
    private _items: ContextMenuItem[];
    private _selectedIndex = 0;
    private _x: number;
    private _y: number;
    private _onItemSelect?: (item: ContextMenuItem, index: number) => void;
    private _onClose?: () => void;

    constructor(
        items: ContextMenuItem[],
        x: number,
        y: number,
        style: Partial<Style> = {},
        callbacks?: {
            onItemSelect?: (item: ContextMenuItem, index: number) => void;
            onClose?: () => void;
        },
    ) {
        super(style);
        this._items = items;
        this._x = x;
        this._y = y;
        this._onItemSelect = callbacks?.onItemSelect;
        this._onClose = callbacks?.onClose;
        this.focusable = true;

        // Set position-based rect for context menu
        this._updateRect();
    }

    /**
     * Update the internal rect based on position and items count.
     * ContextMenu is typically 1-2 characters wider than the longest item label,
     * and height matches the number of items.
     */
    private _updateRect(): void {
        let maxWidth = 10; // Minimum width
        for (const item of this._items) {
            const w = stringWidth(item.label) + 2; // +2 for prefix (e.g., '> ')
            maxWidth = Math.max(maxWidth, w);
        }

        this._rect = {
            x: this._x,
            y: this._y,
            width: maxWidth,
            height: Math.max(1, this._items.length),
        };
    }

    get selectedIndex(): number { return this._selectedIndex; }
    get selectedItem(): ContextMenuItem | undefined { return this._items[this._selectedIndex]; }

    /**
     * Move selection up
     */
    selectPrev(): void {
        let next = this._selectedIndex - 1;
        while (next >= 0 && this._items[next].disabled) next--;
        if (next >= 0) {
            this._selectedIndex = next;
            this.markDirty();
        }
    }

    /**
     * Move selection down
     */
    selectNext(): void {
        let next = this._selectedIndex + 1;
        while (next < this._items.length && this._items[next].disabled) next++;
        if (next < this._items.length) {
            this._selectedIndex = next;
            this.markDirty();
        }
    }

    /**
     * Confirm the current selection
     */
    confirm(): void {
        const item = this._items[this._selectedIndex];
        if (item && !item.disabled) {
            this._onItemSelect?.(item, this._selectedIndex);
        }
    }

    /**
     * Close the context menu
     */
    close(): void {
        this._onClose?.();
    }

    /**
     * Move the context menu to a new position
     */
    moveTo(x: number, y: number): void {
        if (this._x === x && this._y === y) {
            return;
        }
        this._x = x;
        this._y = y;
        this._updateRect();
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        for (let i = 0; i < this._items.length && i < height; i++) {
            const item = this._items[i];
            const isSelected = i === this._selectedIndex;

            // Compose the line with a prefix indicator
            const prefix = isSelected ? (caps.unicode ? '▸ ' : '> ') : '  ';
            let line = prefix + item.label;
            line = truncate(line, width);

            // Cell style: bold if selected, dim if disabled
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
    }
}
