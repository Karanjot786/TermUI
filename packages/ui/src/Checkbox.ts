import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
} from '@termuijs/core';

export interface CheckboxOptions {
    label: string;
    defaultChecked?: boolean;
    onChange?: (checked: boolean) => void;
}

export class Checkbox extends Widget {
    private _checked: boolean;
    private _label: string;

    onChange?: (checked: boolean) => void;

    focusable = true;

    constructor(options: CheckboxOptions) {
        super(mergeStyles(defaultStyle(), { height: 1 }));

        this._checked = options.defaultChecked ?? false;
        this._label = options.label;
        this.onChange = options.onChange;
    }

    get checked(): boolean {
        return this._checked;
    }

    setChecked(checked: boolean): void {
        if (this._checked === checked) return;

        this._checked = checked;
        this.onChange?.(checked);
        this.markDirty();
    }

    toggle(): void {
        this.setChecked(!this._checked);
    }

    handleKey(event: KeyEvent): void {
        if (event.key === 'space') {
            this.toggle();
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;

        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        const checkboxText = this._checked
            ? `[x] ${this._label}`
            : `[ ] ${this._label}`;

        screen.writeString(
            x,
            y,
            checkboxText.slice(0, width),
            attrs
        );
    }
}