// SegmentedControl — single-selection segmented control

import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface SegmentedControlOptions {
    options: string[];
    value?: string;
    activeColor?: Style['fg'];
    onChange?: (value: string) => void;
}

export class SegmentedControl extends Widget {
    private _options: string[];
    private _selectedIndex = 0;
    private _activeColor: Style['fg'];
    private _onChange?: (value: string) => void;

    focusable = true;

    constructor(config: SegmentedControlOptions) {
        super(mergeStyles(defaultStyle(), { height: 1 }));

        this._options = config.options;

        const index = this._options.indexOf(
            config.value ?? this._options[0]
        );

        this._selectedIndex = index >= 0 ? index : 0;

        this._activeColor =
            config.activeColor ??
            { type: 'named', name: 'cyan' };

        this._onChange = config.onChange;
    }

    get value(): string {
        return this._options[this._selectedIndex];
    }

    private _setIndex(index: number): void {
        if (
            index < 0 ||
            index >= this._options.length ||
            index === this._selectedIndex
        ) {
            return;
        }

        this._selectedIndex = index;
        this._onChange?.(this.value);
        this.markDirty();
    }

    next(): void {
        this._setIndex(this._selectedIndex + 1);
    }

    prev(): void {
        this._setIndex(this._selectedIndex - 1);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
                this.prev();
                break;

            case 'right':
                this.next();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y } = this._rect;

        const attrs = styleToCellAttrs(this.style);

        const separator = caps.unicode ? ' │ ' : ' | ';

        let col = x;

        screen.writeString(col, y, '[ ', attrs);
        col += 2;

        for (let i = 0; i < this._options.length; i++) {
            const active = i === this._selectedIndex;

            screen.writeString(
                col,
                y,
                this._options[i],
                {
                    ...attrs,
                    fg: active ? this._activeColor : attrs.fg,
                    bold: active,
                }
            );

            col += this._options[i].length;

            if (i < this._options.length - 1) {
                screen.writeString(col, y, separator, attrs);
                col += separator.length;
            }
        }

        screen.writeString(col, y, ' ]', attrs);
    }
}