import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    stringWidth,
    truncate,
} from '@termuijs/core';
import { firstEnabledIndex, lastEnabledIndex, nextEnabledIndex, previousEnabledIndex } from './navigation.js';

export interface MenuItem {
    label: string;
    shortcut?: string;
    disabled?: boolean;
    onSelect?: () => void;
}

export interface MenuOptions {
    items: MenuItem[];
    onClose?: () => void;
    style?: Partial<Style>;
}

/**
 * Menu — a vertical list of interactive items supporting keyboard navigation,
 * shortcuts, and disabled states.
 */
export class Menu extends Widget {
    private _items: MenuItem[];
    private _selectedIndex = 0;
    private _onClose?: () => void;

    constructor(options: MenuOptions) {
        super(mergeStyles(defaultStyle(), {
            padding: 0,
            ...options.style
        }));
        this._items = options.items;
        this._onClose = options.onClose;
        this.focusable = true;

        // Initialize selection to the first enabled item
        this._initSelection();
    }

    private _initSelection(): void {
        const first = firstEnabledIndex(this._items, (item) => Boolean(item.disabled));
        this._selectedIndex = first >= 0 ? first : 0;
    }

    private _selectNext(): void {
        const next = nextEnabledIndex(this._items, this._selectedIndex, (item) => Boolean(item.disabled), true);
        if (next !== this._selectedIndex) {
            this._selectedIndex = next;
            this.markDirty();
        }
    }

    private _selectPrev(): void {
        const prev = previousEnabledIndex(this._items, this._selectedIndex, (item) => Boolean(item.disabled), true);
        if (prev !== this._selectedIndex) {
            this._selectedIndex = prev;
            this.markDirty();
        }
    }

    private _confirm(): void {
        const item = this._items[this._selectedIndex];
        if (item && !item.disabled) {
            item.onSelect?.();
            // No markDirty — selection did not change
        }
    }

    handleKey(event: KeyEvent): boolean {
        switch (event.key) {
            case 'up':
                this._selectPrev();
                return true;
            case 'down':
                this._selectNext();
                return true;
            case 'home': {
                const first = firstEnabledIndex(this._items, (item) => Boolean(item.disabled));
                if (first >= 0 && first !== this._selectedIndex) {
                    this._selectedIndex = first;
                    this.markDirty();
                }
                return true;
            }
            case 'end': {
                const last = lastEnabledIndex(this._items, (item) => Boolean(item.disabled));
                if (last >= 0 && last !== this._selectedIndex) {
                    this._selectedIndex = last;
                    this.markDirty();
                }
                return true;
            }
            case 'enter':
            case 'space':
                this._confirm();
                return true;
            case 'escape':
                this._onClose?.();
                // No markDirty — widget is being closed
                return true;
        }
        return false;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const baseAttrs = styleToCellAttrs(this.style);

        for (let i = 0; i < this._items.length; i++) {
            if (i >= height) break;

            const item = this._items[i];
            const isSelected = i === this._selectedIndex;
            
            // Highlight selected row
            const rowStyle = {
                ...baseAttrs,
                fg: item.disabled ? { type: 'named' as const, name: 'brightBlack' as const } : baseAttrs.fg,
                bg: isSelected ? { type: 'named' as const, name: 'cyan' as const } : baseAttrs.bg,
                bold: isSelected,
                dim: item.disabled,
            };

            // Clear row
            screen.writeString(x, y + i, ' '.repeat(width), rowStyle);

            // Render label
            const label = truncate(item.label, width - 2);
            screen.writeString(x + 1, y + i, label, rowStyle);

            // Render shortcut if space allows
            if (item.shortcut) {
                const shortcut = item.shortcut;
                const shortcutWidth = stringWidth(shortcut);
                if (width > stringWidth(label) + shortcutWidth + 4) {
                    screen.writeString(x + width - shortcutWidth - 1, y + i, shortcut, {
                        ...rowStyle,
                        fg: isSelected ? rowStyle.fg : { type: 'named', name: 'brightBlack' }
                    });
                }
            }
        }
    }
}
