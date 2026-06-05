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
    /** Empty star character. Default: '☆' with ASCII fallback '-' */
    emptyChar?: string;
    /** Color for filled stars */
    filledColor?: Color;
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
    private _emptyChar?: string;
    private _filledColor?: Color;

    /** Callback when the user confirms a rating via enter. */
    onSelect?: (value: number) => void;

    focusable = true;

    constructor(style: Partial<Style> = {}, opts: RatingOptions = {}) {
        const max = Math.max(opts.max ?? 5, 1);

        super(mergeStyles(defaultStyle(), { ...style, height: 1 }));

        this._max = max;
        this._value = Math.max(0, Math.min(opts.value ?? 0, max));
        this._filledChar = opts.filledChar;
        this._emptyChar = opts.emptyChar;
        this._filledColor = opts.filledColor;
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

    // ── Public methods ────────────────────────────────

    /** Set the rating value (clamped to 0..max). Calls markDirty(). */
    setValue(value: number): void {
        const clamped = Math.max(0, Math.min(value, this._max));
        if (clamped === this._value) return;
        this._value = clamped;
        this.markDirty();
    }

    /** Get the current rating value. */
    getValue(): number {
        return this._value;
    }

    // ── Key handling ──────────────────────────────────

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'right':
                this.setValue(this._value + 1);
                break;
            case 'left':
                this.setValue(this._value - 1);
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
        }
    }

    // ── Rendering ─────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        const filled = this._filledChar ?? (caps.unicode ? '★' : '*');
        const empty = this._emptyChar ?? (caps.unicode ? '☆' : '-');

        let text = '';
        for (let i = 0; i < this._max; i++) {
            text += i < this._value ? filled : empty;
        }

        screen.writeString(x, y, text.slice(0, width), attrs);
    }
}
