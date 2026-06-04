// ─────────────────────────────────────────────────────
// @termuijs/ui — Rating widget
//
// Renders a star rating selector controlled by arrow keys.
// Right/left arrows adjust the value; enter confirms and
// fires onChange.
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface RatingOptions {
    /** Total number of stars, default 5 */
    max?: number;
    /** Initial value, 0 = none, default 0 */
    value?: number;
    /** Readonly disables key input */
    readonly?: boolean;
    /** Callback when value changes */
    onChange?: (value: number) => void;
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

    /** Readonly disables key input. */
    readonly: boolean;

    /** Callback when value changes via enter key. */
    onChange?: (value: number) => void;

    focusable = true;

    constructor(options: RatingOptions = {}) {
        const max = Math.max(options.max ?? 5, 1);

        super(mergeStyles(defaultStyle(), { height: 1 }));

        this._max = max;
        this._value = Math.max(0, Math.min(options.value ?? 0, max));
        this.readonly = options.readonly ?? false;
        this.onChange = options.onChange;
    }

    // ── Accessors ─────────────────────────────────────

    /** The current rating value (0 to max). */
    get value(): number {
        return this._value;
    }

    set value(n: number) {
        const clamped = Math.max(0, Math.min(n, this._max));
        if (clamped === this._value) return;
        this._value = clamped;
        this.markDirty();
    }

    /** The maximum number of stars. */
    get max(): number {
        return this._max;
    }

    // ── Key handling ──────────────────────────────────

    handleKey(event: KeyEvent): void {
        if (this.readonly) return;

        switch (event.key) {
            case 'right':
                this.value = this._value + 1;
                break;
            case 'left':
                this.value = this._value - 1;
                break;
            case 'home':
                this.value = 0;
                break;
            case 'end':
                this.value = this._max;
                break;
            case 'enter':
                this.onChange?.(this._value);
                break;
        }
    }

    // ── Rendering ─────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        const filled = caps.unicode ? '★' : '*';
        const empty = caps.unicode ? '☆' : '-';

        let text = '';
        for (let i = 0; i < this._max; i++) {
            text += i < this._value ? filled : empty;
        }

        screen.writeString(x, y, text.slice(0, width), attrs);
    }
}
