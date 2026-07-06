import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    stringWidth,
    caps,
    prefersReducedMotion,
} from '@termuijs/core';
import { fadeIn, fadeOut } from '@termuijs/motion';

export interface SwitchOptions {
    defaultValue?: boolean;
    label?: string;
    onChange?: (value: boolean) => void;
}

export class Switch extends Widget {
    private _value: boolean;
    private _label?: string;
    onChange?: (value: boolean) => void;
    private _animProgress: number;
    private _animCancel?: () => void;

    focusable = true;

    constructor(options: SwitchOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: 1 }));

        this._value = options.defaultValue ?? false;
        this._label = options.label;
        this.onChange = options.onChange;
        this._animProgress = this._value ? 1 : 0;
    }

    get value(): boolean {
        return this._value;
    }

    setValue(value: boolean): void {
        if (this._value === value) return;

        this._value = value;
        this.onChange?.(value);
        this._animCancel?.();
        this.markDirty();

        if (prefersReducedMotion()) {
            this._animProgress = value ? 1 : 0;
            return;
        }

        if (value) {
            this._animProgress = 0;
            this._animCancel = fadeIn(150, (p) => {
                this._animProgress = p;
                this.markDirty();
            }, () => {
                this._animProgress = 1;
                this._animCancel = undefined;
            });
        } else {
            this._animProgress = 1;
            this._animCancel = fadeOut(150, (p) => {
                this._animProgress = p;
                this.markDirty();
            }, () => {
                this._animProgress = 0;
                this._animCancel = undefined;
            });
        }
    }

    toggle(): void {
        this.setValue(!this._value);
    }

    mount(): void {
        super.mount();
        if (this._value && this._animProgress < 1) {
            this._animProgress = 1;
            this.markDirty();
        }
    }

    unmount(): void {
        this._animCancel?.();
        this._animCancel = undefined;
        super.unmount();
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
        const knobPos = Math.round(this._animProgress * 2);
        const transitioning = this._animProgress > 0 && this._animProgress < 1;

        let trackChars: string[];
        let knobChar: string;
        if (caps.unicode) {
            trackChars = ['─', '─', '─'];
            knobChar = '●';
        } else {
            trackChars = ['-', '-', '-'];
            knobChar = 'O';
        }

        let cursorX = x;

        if (this._label) {
            screen.writeString(cursorX, y, `${this._label} `, attrs);
            cursorX += stringWidth(`${this._label} `);
        }

        for (let i = 0; i < 3; i++) {
            const isKnob = i === knobPos;
            const isOn = this._value;
            screen.setCell(cursorX + i, y, {
                char: isKnob ? knobChar : trackChars[i],
                fg: attrs.fg,
                dim: transitioning || (!isKnob && !isOn),
                bold: isKnob,
            });
        }
    }
}