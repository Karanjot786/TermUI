import { Widget } from '../base/Widget.js';
import {
    type Screen,
    type Style,
    type Color,
    type KeyEvent,
    styleToCellAttrs,
    caps,
    stringWidth,
} from '@termuijs/core';

export interface RangeInputOptions {
    min?: number;
    max?: number;
    step?: number;
    low?: number;
    high?: number;
    color?: Color;
    showValue?: boolean;
    onChange?: (low: number, high: number) => void;
}

export class RangeInput extends Widget {
    private _label: string;
    private _min: number;
    private _max: number;
    private _step: number;
    private _color: Color;
    private _showValue: boolean;
    private _activeHandle: 'low' | 'high';
    private _low: number;
    private _high: number;
    private _onChange?: (low: number, high: number) => void;

    constructor(
        label: string,
        style: Partial<Style> = {},
        opts: RangeInputOptions = {},
    ) {
        super(style);

        this._label = label;
        this._min = opts.min ?? 0;
        this._max = opts.max ?? 100;
        this._step = opts.step ?? 1;
        this._color = opts.color ?? { type: 'named', name: 'cyan' };
        this._showValue = opts.showValue ?? true;
        
        const initialLow = opts.low ?? this._min;
        const initialHigh = opts.high ?? this._max;
        const lo = Math.min(Math.max(initialLow, this._min), this._max);
        const hi = Math.min(Math.max(initialHigh, this._min), this._max);
        this._low = Math.min(lo, hi);
        this._high = Math.max(lo, hi);
        
        this._activeHandle = 'low';
        this._onChange = opts.onChange;

        this.focusable = true;
    }

    getLow(): number {
        return this._low;
    }

    getHigh(): number {
        return this._high;
    }

    setLow(value: number): void {
        const clamped = Math.max(this._min, Math.min(value, this._high));
        if (clamped === this._low) return;
        this._low = clamped;
        this.markDirty();
        this._onChange?.(this._low, this._high);
    }

    setHigh(value: number): void {
        const clamped = Math.min(this._max, Math.max(value, this._low));
        if (clamped === this._high) return;
        this._high = clamped;
        this.markDirty();
        this._onChange?.(this._low, this._high);
    }

    setRange(low: number, high: number): void {
        const newLow = Math.max(this._min, Math.min(low, high));
        const newHigh = Math.min(this._max, Math.max(low, high));
        if (newLow === this._low && newHigh === this._high) return;
        this._low = newLow;
        this._high = newHigh;
        this.markDirty();
        this._onChange?.(this._low, this._high);
    }

    handleKey(event: KeyEvent): void {
        if (event.key === 'tab') {
            this._activeHandle =
                this._activeHandle === 'low' ? 'high' : 'low';
            this.markDirty();
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (this._activeHandle === 'low') {
            if (event.key === 'right') this.setLow(this._low + this._step);
            if (event.key === 'left') this.setLow(this._low - this._step);
        } else {
            if (event.key === 'right') this.setHigh(this._high + this._step);
            if (event.key === 'left') this.setHigh(this._high - this._step);
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Layout: "Label  ◄ [track] ►  low – high"
        const labelStr = this._label + '  ';
        const leftCap = caps.unicode ? '◄ ' : '< ';
        const rightCap = caps.unicode ? ' ►' : ' >';
        const valueStr = this._showValue
            ? `  ${this._low} – ${this._high}`
            : '';

        const labelWidth = stringWidth(labelStr);
        const leftCapWidth = stringWidth(leftCap);
        const rightCapWidth = stringWidth(rightCap);
        const valueWidth = stringWidth(valueStr);

        const trackWidth = Math.max(
            0,
            width - labelWidth - leftCapWidth - rightCapWidth - valueWidth,
        );

        // Render label
        screen.writeString(x, y, labelStr, { ...attrs, bold: true });

        // Render left cap
        screen.writeString(x + labelWidth, y, leftCap, attrs);

        // Render track (3 zones: before low, between low–high, after high)
        const range = this._max - this._min || 1;
        const lowCell = Math.round(trackWidth * (this._low - this._min) / range);
        const highCell = Math.round(trackWidth * (this._high - this._min) / range);
        const trackX = x + labelWidth + leftCapWidth;

        for (let i = 0; i < trackWidth; i++) {
            const inRange = i >= lowCell && i < highCell;
            const isActiveLow = i === lowCell && this._activeHandle === 'low';
            const isActiveHigh = i === highCell - 1 && this._activeHandle === 'high';

            const char = inRange
                ? (caps.unicode ? '█' : '#')
                : (caps.unicode ? '░' : '-');

            screen.setCell(trackX + i, y, {
                char,
                fg: (isActiveLow || isActiveHigh)
                    ? { type: 'named', name: 'yellow' }
                    : inRange
                        ? this._color
                        : { type: 'named', name: 'brightBlack' },
            });
        }

        // Render right cap
        screen.writeString(trackX + trackWidth, y, rightCap, attrs);

        // Render value
        if (this._showValue) {
            screen.writeString(trackX + trackWidth + rightCapWidth, y, valueStr, {
                ...attrs,
                bold: true,
            });
        }
    }
}
