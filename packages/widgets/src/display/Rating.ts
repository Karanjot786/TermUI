// -----------------------------------------------------------------------------
// @termuijs/widgets - Rating widget
// -----------------------------------------------------------------------------

import { type Screen, type Style, caps, styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface RatingOptions {
    value?: number;
    max?: number;
    showLabel?: boolean;
}

/**
 * Rating - displays a star rating with optional textual feedback.
 */
export class Rating extends Widget {
    private _value: number;
    private _max: number;
    private _showLabel: boolean;

    constructor(style: Partial<Style> = {}, opts: RatingOptions = {}) {
        super(style);

        this._max = Math.max(1, opts.max ?? 5);
        this._value = Math.max(
            0,
            Math.min(opts.value ?? 0, this._max),
        );
        this._showLabel = opts.showLabel ?? false;
    }

    getValue(): number {
        return this._value;
    }

    getMax(): number {
        return this._max;
    }

    setValue(value: number): void {
        const nextValue = Math.max(
            0,
            Math.min(value, this._max),
        );

        if (this._value === nextValue) return;

        this._value = nextValue;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const filled = caps.unicode ? '★' : '*';
        const empty = caps.unicode ? '☆' : '-';

        const stars =
            filled.repeat(this._value) +
            empty.repeat(this._max - this._value);

        screen.writeString(
            x,
            y,
            stars.slice(0, width),
            attrs,
        );

        if (this._showLabel && height > 1) {
            const label = `Rating: ${this._value} / ${this._max}`;

            screen.writeString(
                x,
                y + 1,
                label.slice(0, width),
                attrs,
            );
        }
    }
}