// ─────────────────────────────────────────────────────
// @termuijs/ui — Rating widget
//
// Renders a star rating selector controlled by arrow keys.
// Right/left arrows adjust the value; enter confirms and
// fires onSelect.
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type Style,
    type Color,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface RatingOptions {
    /** Total number of stars. Default: 5 */
    max?: number;
    /** Initial rating. Default: 0 */
    value?: number;
    /** Filled star character. Default: '★' with ASCII fallback '*' */
    filledChar?: string;
    /** Half star character. Default: '½' with ASCII fallback '*' */
    halfStarChar?: string;
    /** Empty star character. Default: '☆' with ASCII fallback '-' */
    emptyChar?: string;
    /** Color for filled stars */
    filledColor?: Color;
    /** Color for empty stars */
    emptyColor?: Color;
    /** Step precision (0.5 or 1). Default: 1 */
    precision?: 0.5 | 1;
    /** Show numerical label e.g. (3/5). Default: false */
    showLabel?: boolean;
    /** Disable user interaction if true. Default: false */
    readonly?: boolean;
    /** Callback when rating value changes */
    onChange?: (value: number) => void;
    /** Callback when the user confirms a rating via enter */
    onSelect?: (value: number) => void;
}

/**
 * Rating — renders a row of star glyphs for a 1-to-N rating.
 *
 * Example output (unicode, max=5, value=3):
 *   ★★★☆☆
 *
 * ASCII fallback:
 *   ***--
 */
export class Rating extends Widget {
    private _value: number;
    private _max: number;
    private _filledChar?: string;
    private _halfStarChar?: string;
    private _emptyChar?: string;
    private _filledColor?: Color;
    private _emptyColor?: Color;
    private _precision: 0.5 | 1;
    private _showLabel: boolean;
    private _readonly: boolean;

    /** Callback when rating value changes. */
    onChange?: (value: number) => void;
    /** Callback when the user confirms a rating via enter. */
    onSelect?: (value: number) => void;

    focusable = true;

    constructor(style: Partial<Style> = {}, opts: RatingOptions = {}) {
        const rawMax = opts.max ?? 5;
        const max = Number.isFinite(rawMax) ? Math.max(Math.floor(rawMax), 1) : 5;
        const precision = opts.precision === 0.5 ? 0.5 : 1;
        const rawValue = opts.value ?? 0;
        const value = Number.isFinite(rawValue) ? rawValue : 0;
        const snapped = Math.round(value / precision) * precision;

        super(mergeStyles(defaultStyle(), { ...style, height: 1 }));

        this._max = max;
        this._precision = precision;
        this._value = Math.max(0, Math.min(snapped, max));
        this._filledChar = opts.filledChar;
        this._halfStarChar = opts.halfStarChar;
        this._emptyChar = opts.emptyChar;
        this._filledColor = opts.filledColor;
        this._emptyColor = opts.emptyColor;
        this._showLabel = opts.showLabel ?? false;
        this._readonly = opts.readonly ?? false;
        this.onChange = opts.onChange;
        this.onSelect = opts.onSelect;
    }

    // ── Accessors ─────────────────────────────────────

    /** The current rating value (0 to max). */
    get value(): number {
        return this._value;
    }

    /** The maximum number of stars. */
    get max(): number {
        return this._max;
    }

    /** Step precision (0.5 or 1). */
    get precision(): 0.5 | 1 {
        return this._precision;
    }

    /** Whether the rating is read-only. */
    get readonly(): boolean {
        return this._readonly;
    }

    /** Whether numerical label is enabled. */
    get showLabel(): boolean {
        return this._showLabel;
    }

    // ── Public methods ────────────────────────────────

    setReadonly(readonly: boolean): void {
        if (this._readonly === readonly) return;
        this._readonly = readonly;
        this.markDirty();
    }

    setPrecision(precision: 0.5 | 1): void {
        if (this._precision === precision) return;
        this._precision = precision;
        this.setValue(this._value);
    }

    setShowLabel(show: boolean): void {
        if (this._showLabel === show) return;
        this._showLabel = show;
        this.markDirty();
    }

    setEmptyColor(color?: Color): void {
        this._emptyColor = color;
        this.markDirty();
    }

    setFilledColor(color?: Color): void {
        this._filledColor = color;
        this.markDirty();
    }

    setHalfStarChar(char: string): void {
        this._halfStarChar = char;
        this.markDirty();
    }

    /** Set the rating value (clamped & snapped to precision). Calls markDirty(). */
    setValue(value: number): void {
        const finiteValue = Number.isFinite(value) ? value : 0;
        const snapped = Math.round(finiteValue / this._precision) * this._precision;
        const clamped = Math.max(0, Math.min(snapped, this._max));
        if (clamped === this._value) return;
        this._value = clamped;
        this.onChange?.(this._value);
        this.markDirty();
    }

    /** Get the current rating value. */
    getValue(): number {
        return this._value;
    }

    // ── Key handling ──────────────────────────────────

    handleKey(event: KeyEvent): void {
        if (this._readonly) return;

        switch (event.key) {
            case 'right':
            case 'up':
                this.setValue(this._value + this._precision);
                break;
            case 'left':
            case 'down':
                this.setValue(this._value - this._precision);
                break;
            case 'home':
                this.setValue(0);
                break;
            case 'end':
                this.setValue(this._max);
                break;
            case 'enter':
                this.onSelect?.(this._value);
                break;
            default:
                if (event.key.length === 1 && event.key >= '0' && event.key <= '9') {
                    const num = parseInt(event.key, 10);
                    if (num <= this._max) {
                        this.setValue(num);
                    }
                }
                break;
        }
    }

    // ── Rendering ─────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        const filledChar = this._filledChar ?? (caps.unicode ? '★' : '*');
        const halfChar = this._halfStarChar ?? (caps.unicode ? '½' : '*');
        const emptyChar = this._emptyChar ?? (caps.unicode ? '☆' : '-');

        let currentX = x;
        const maxX = x + width;

        for (let i = 0; i < this._max; i++) {
            if (currentX >= maxX) break;

            const starVal = i + 1;
            let charToRender = emptyChar;
            let fgColor = this._emptyColor;

            if (this._value >= starVal) {
                charToRender = filledChar;
                fgColor = this._filledColor;
            } else if (this._value >= starVal - 0.5) {
                charToRender = halfChar;
                fgColor = this._filledColor;
            }

            const cellAttrs = fgColor ? { ...attrs, fg: fgColor } : attrs;
            screen.writeString(currentX, y, charToRender, cellAttrs);
            currentX += charToRender.length;
        }

        if (this._showLabel && currentX < maxX) {
            const label = ` (${this._value}/${this._max})`;
            screen.writeString(currentX, y, label.slice(0, maxX - currentX), attrs);
        }
    }
}

