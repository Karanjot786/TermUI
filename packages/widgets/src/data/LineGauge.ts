import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { validateFinite } from './utils.js';

export interface LineGaugeOptions {
    /** Filled portion character. Default: '━' with ASCII fallback '=' */
    filledChar?: string;

    /** Empty portion character. Default: '─' with ASCII fallback '-' */
    emptyChar?: string;

    /** Show percentage label at right. Default: true */
    showLabel?: boolean;

    fillColor?: Color;
    emptyColor?: Color;
}

export class LineGauge extends Widget {
    private _value = 0;
    private _filledChar: string;
    private _emptyChar: string;
    private _showLabel: boolean;
    private _fillColor?: Color;
    private _emptyColor?: Color;

    constructor(style: Partial<Style> = {}, opts: LineGaugeOptions = {}) {
        super(style);
        this._filledChar = opts.filledChar ?? (caps.unicode ? '━' : '=');
        this._emptyChar = opts.emptyChar ?? (caps.unicode ? '─' : '-');
        this._showLabel = opts.showLabel ?? true;
        this._fillColor = opts.fillColor;
        this._emptyColor = opts.emptyColor;
    }

    setValue(value: number): void {
        const clamped = validateFinite(value, 0, 0, 1);
        if (clamped === this._value) return;
        this._value = clamped;
        this.markDirty();
    }

    getValue(): number {
        return this._value;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const percentStr = this._showLabel ? ` ${Math.round(this._value * 100)}%` : '';
        const percentWidth = stringWidth(percentStr);
        const barWidth = Math.max(0, width - percentWidth);
        const filled = Math.round(barWidth * this._value);

        for (let i = 0; i < barWidth; i++) {
            const char = i < filled ? this._filledChar : this._emptyChar;
            screen.setCell(x + i, y, {
                char,
                fg: i < filled
                    ? (this._fillColor ?? attrs.fg)
                    : (this._emptyColor ?? { type: 'named', name: 'brightBlack' }),
            });
        }

        if (this._showLabel) {
            screen.writeString(x + barWidth, y, percentStr, attrs);
        }
    }
}
