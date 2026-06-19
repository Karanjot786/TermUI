import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type Style,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface SliderOptions {
    min: number;
    max: number;
    step?: number;
    value?: number;
    onChange?: (value: number) => void;
}

export interface RangeInputOptions {
    min: number;
    max: number;
    step?: number;
    low?: number;
    high?: number;
    onChange?: (low: number, high: number) => void;
}

export class Slider extends Widget {
    private _value: number;
    private _min: number;
    private _max: number;
    private _step: number;

    onChange?: (value: number) => void;

    focusable = true;

    constructor(
        style: Partial<Style> = {},
        opts: SliderOptions,
    ) {
        super(
            mergeStyles(
                defaultStyle(),
                { height: 1, ...style },
            ),
        );

        this._min = opts.min;
        this._max = opts.max;
        this._step = opts.step ?? 1;
        this._value = this._clamp(opts.value ?? opts.min);
        this.onChange = opts.onChange;
    }

    private _clamp(value: number): number {
        return Math.min(
            this._max,
            Math.max(this._min, value),
        );
    }

    getValue(): number {
        return this._value;
    }

    setValue(value: number): void {
        const clamped = this._clamp(value);

        if (clamped === this._value) return;

        this._value = clamped;
        this.onChange?.(this._value);
        this.markDirty();
    }

    increment(): void {
        this.setValue(this._value + this._step);
    }

    decrement(): void {
        this.setValue(this._value - this._step);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'right':
                this.increment();
                break;

            case 'left':
                this.decrement();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;

        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        const trackChar = caps.unicode ? '\u2500' : '-';
const handleChar = caps.unicode ? '\u25CF' : 'O';
        const ratio =
            (this._value - this._min) /
            (this._max - this._min || 1);

        const handlePos =
            Math.round(ratio * (width - 1));

        let track = trackChar.repeat(width);

        track =
            track.slice(0, handlePos) +
            handleChar +
            track.slice(handlePos + 1);

        screen.writeString(x, y, track, attrs);
    }
}

export class RangeInput extends Widget {
    private _low: number;
    private _high: number;
    private _min: number;
    private _max: number;
    private _step: number;
    private _editingLow = true;

    onChange?: (low: number, high: number) => void;

    focusable = true;

    constructor(
        style: Partial<Style> = {},
        opts: RangeInputOptions,
    ) {
        super(
            mergeStyles(
                defaultStyle(),
                { height: 1, ...style },
            ),
        );

        this._min = opts.min;
        this._max = opts.max;
        this._step = opts.step ?? 1;

        this.onChange = opts.onChange;

this._low = this._min;
this._high = this._max;

this.setRange(
    opts.low ?? this._min,
    opts.high ?? this._max,
);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
                if (this._editingLow) {
                    this.setRange(this._low - this._step, this._high);
                } else {
                    this.setRange(this._low, this._high - this._step);
                }
                break;
            case 'right':
                if (this._editingLow) {
                    this.setRange(this._low + this._step, this._high);
                } else {
                    this.setRange(this._low, this._high + this._step);
                }
                break;
            case 'up':
            case 'down':
                this._editingLow = !this._editingLow;
                this.markDirty();
                break;
        }
    }

    getLow(): number {
        return this._low;
    }

    getHigh(): number {
        return this._high;
    }

    setRange(low: number, high: number): void {
    const nextLow = Math.max(
        this._min,
        Math.min(this._max, low),
    );

    const nextHigh = Math.max(
        this._min,
        Math.min(this._max, high),
    );

    const normalizedLow = Math.min(
        nextLow,
        nextHigh,
    );

    const normalizedHigh = Math.max(
        nextLow,
        nextHigh,
    );

    if (
        normalizedLow === this._low &&
        normalizedHigh === this._high
    ) {
        return;
    }

    this._low = normalizedLow;
    this._high = normalizedHigh;

    this.onChange?.(this._low, this._high);
    this.markDirty();
}

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;

        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        const trackChar = caps.unicode ? '\u2500' : '-';
        const handleChar = caps.unicode ? '\u25CF' : 'O';

        const range = this._max - this._min || 1;

        const lowPos = Math.round(
            ((this._low - this._min) / range) * (width - 1),
        );

        const highPos = Math.round(
            ((this._high - this._min) / range) * (width - 1),
        );

        const chars = trackChar.repeat(width).split('');

        if (lowPos >= 0 && lowPos < chars.length) {
            chars[lowPos] = handleChar;
        }

        if (highPos >= 0 && highPos < chars.length) {
            chars[highPos] = handleChar;
        }

        screen.writeString(
            x,
            y,
            chars.join(''),
            attrs,
        );
    }
}