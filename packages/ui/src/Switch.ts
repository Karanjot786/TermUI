import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface SwitchOptions {
    defaultValue?: boolean;
    label?: string;
    onChange?: (value: boolean) => void;
}

export class Switch extends Widget {
    private _value: boolean;
    private _label?: string;
    onChange?: (value: boolean) => void;

    focusable = true;

    constructor(options: SwitchOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: 1 }));

        this._value = options.defaultValue ?? false;
        this._label = options.label;
        this.onChange = options.onChange;
    }

    get value(): boolean {
        return this._value;
    }

    setValue(value: boolean): void {
        if (this._value === value) return;

        this._value = value;
        this.onChange?.(value);
        this.markDirty();
    }

    toggle(): void {
        this.setValue(!this._value);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'space':
                this.toggle();
                break;

            case 'right':
                this.setValue(true);
                break;

            case 'left':
                this.setValue(false);
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;

        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        const track = caps.unicode
            ? (this._value ? '──●' : '●──')
            : (this._value ? '--O' : 'O--');

        const text = this._label
            ? `${this._label} ${track}`
            : track;

        screen.writeString(
            x,
            y,
            text.slice(0, width),
            attrs
        );
    }
}