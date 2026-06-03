import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Color,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
} from '@termuijs/core';

export interface ButtonGroupItem {
    label: string;
    value: string;
    disabled?: boolean;
}

export interface ButtonGroupOptions {
    activeColor?: Color;
    inactiveColor?: Color;
    onSelect?: (value: string) => void;
}

export class ButtonGroup extends Widget {
    private _items: ButtonGroupItem[];
    private _activeIndex = -1;
    private _activeColor: Color;
    private _inactiveColor: Color;
    private _onSelect?: (value: string) => void;

    focusable = true;

    constructor(
        items: ButtonGroupItem[],
        style: Partial<Style> = {},
        opts: ButtonGroupOptions = {}
    ) {
        super(mergeStyles(mergeStyles(defaultStyle(), { height: 1 }), style as Style));

        this._items = items;
        this._activeColor = opts.activeColor ?? { type: 'named', name: 'cyan' };
        this._inactiveColor = opts.inactiveColor ?? { type: 'named', name: 'brightBlack' };
        this._onSelect = opts.onSelect;
        this._activeIndex = this._firstEnabledIndex();
    }

    setItems(items: ButtonGroupItem[]): void {
        this._items = items;

        const activeValue = this.getActiveValue();
        const activeIndex = this._items.findIndex(
            (item) => !item.disabled && item.value === activeValue
        );

        this._activeIndex = activeIndex >= 0
            ? activeIndex
            : this._firstEnabledIndex();

        this.markDirty();
    }

    setActiveValue(value: string): void {
        const index = this._items.findIndex(
            (item) => !item.disabled && item.value === value
        );

        if (index < 0 || index === this._activeIndex) return;

        this._activeIndex = index;
        this.markDirty();
    }

    getActiveValue(): string {
        return this._items[this._activeIndex]?.value ?? '';
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
                this._move(-1);
                break;

            case 'right':
                this._move(1);
                break;

            case 'enter':
                this._onSelect?.(this.getActiveValue());
                break;
        }
    }

    private _firstEnabledIndex(): number {
        return this._items.findIndex((item) => !item.disabled);
    }

    private _move(direction: -1 | 1): void {
        if (this._items.length === 0) return;

        let index = this._activeIndex;

        for (let i = 0; i < this._items.length; i++) {
            index = (index + direction + this._items.length) % this._items.length;

            if (!this._items[index].disabled) {
                this._activeIndex = index;
                this.markDirty();
                return;
            }
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;

        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        let col = x;

        for (let i = 0; i < this._items.length; i++) {
            const item = this._items[i];
            const label = `[${item.label}]`;
            const active = i === this._activeIndex;
            const remaining = x + width - col;

            if (remaining <= 0) return;

            screen.writeString(
                col,
                y,
                label.slice(0, remaining),
                {
                    ...attrs,
                    fg: active ? this._activeColor : this._inactiveColor,
                    bold: active,
                    dim: item.disabled || !active,
                }
            );

            col += label.length;

            if (i < this._items.length - 1) {
                const spacerRemaining = x + width - col;

                if (spacerRemaining <= 0) return;

                screen.writeString(col, y, ' '.slice(0, spacerRemaining), attrs);
                col++;
            }
        }
    }
}
