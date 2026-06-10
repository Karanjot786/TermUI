import { Widget } from '@termuijs/widgets';
import { type Style, type Color, type KeyEvent, type Screen, mergeStyles, defaultStyle, styleToCellAttrs } from '@termuijs/core';

export interface ListbarItem {
    label: string;
    key?: string;
    action?: () => void;
    disabled?: boolean;
}

export interface ListbarOptions {
    activeColor?: Color;
    keyColor?: Color;
    separator?: string;
}

export class Listbar extends Widget {
    private _items: ListbarItem[] = [];
    private _activeIndex = 0;
    private _activeColor: Color;
    private _keyColor: Color;
    private _separator: string;

    focusable = true;

    constructor(items: ListbarItem[], style?: Partial<Style>, opts?: ListbarOptions) {
        super(mergeStyles(defaultStyle(), { height: 1, ...style }));
        this._items = items;
        this._activeColor = opts?.activeColor ?? { type: 'named', name: 'cyan' };
        this._keyColor = opts?.keyColor ?? { type: 'named', name: 'yellow' };
        this._separator = opts?.separator ?? ' | ';
        this._initActiveIndex();
    }

    get activeItem(): number {
        return this._activeIndex;
    }

    setItems(items: ListbarItem[]): void {
        this._items = items;
        this._initActiveIndex();
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
                this._activeIndex = this._nextEnabled(this._activeIndex, -1);
                this.markDirty();
                break;

            case 'right':
                this._activeIndex = this._nextEnabled(this._activeIndex, 1);
                this.markDirty();
                break;

            case 'enter':
                const item = this._items[this._activeIndex];
                if (item && !item.disabled && item.action) {
                    item.action();
                }
                break;
        }
    }

    private _initActiveIndex(): void {
        this._activeIndex = 0;
        for (let i = 0; i < this._items.length; i++) {
            if (!this._items[i].disabled) {
                this._activeIndex = i;
                return;
            }
        }
    }

    private _nextEnabled(from: number, direction: number): number {
        if (this._items.length === 0) return from;

        let i = from;
        do {
            i = (i + direction + this._items.length) % this._items.length;
            if (!this._items[i].disabled) return i;
        } while (i !== from);

        return from;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;
        if (width <= 0) return;

        const baseAttrs = styleToCellAttrs(this.style);
        let col = x;

        for (let i = 0; i < this._items.length; i++) {
            if (col >= x + width) break;

            const item = this._items[i];
            const isActive = i === this._activeIndex;

            if (item.key) {
                const keyText = `${item.key} `;
                const keyColor = item.disabled
                    ? { type: 'named', name: 'brightBlack' } as Color
                    : isActive
                        ? this._activeColor
                        : this._keyColor;

                const keyVisible = keyText.slice(0, x + width - col);
                screen.writeString(col, y, keyVisible, {
                    ...baseAttrs,
                    fg: keyColor,
                    dim: item.disabled,
                    bold: isActive,
                });
                col += keyText.length;
                if (col >= x + width) break;
            }

            const labelVisible = item.label.slice(0, x + width - col);
            screen.writeString(col, y, labelVisible, {
                ...baseAttrs,
                fg: item.disabled
                    ? { type: 'named', name: 'brightBlack' }
                    : isActive
                        ? this._activeColor
                        : baseAttrs.fg,
                dim: item.disabled,
                bold: isActive,
            });
            col += item.label.length;

            if (i < this._items.length - 1 && col < x + width) {
                const sepVisible = this._separator.slice(0, x + width - col);
                screen.writeString(col, y, sepVisible, baseAttrs);
                col += this._separator.length;
            }
        }
    }
}
