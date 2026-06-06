// ─────────────────────────────────────────────────────
// @termuijs/widgets — Gradient widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, caps, parseColor } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface GradientOptions {
    /** Start color (hex string like '#ff0000' or named color string) */
    startColor?: string;
    /** End color (hex string like '#0000ff' or named color string) */
    endColor?: string;
    /** Text alignment */
    align?: 'left' | 'center' | 'right';
}

/** Parse a hex color string to [r, g, b] */
function hexToRgb(hex: string): [number, number, number] | null {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return null;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
}

/** Interpolate between two RGB values at t ∈ [0,1] */
function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
    ];
}

/**
 * Gradient — text rendered with a smooth color gradient.
 *
 * Each character is colored by linearly interpolating between startColor and endColor.
 * Falls back to a single foreground color if true-color is unavailable.
 */
export class Gradient extends Widget {
    private _text: string;
    private _startColor: string;
    private _endColor: string;
    private _align: 'left' | 'center' | 'right';

    constructor(text: string, style: Partial<Style> = {}, opts: GradientOptions = {}) {
        super({ height: 1, ...style });
        this._text = text;
        this._startColor = opts.startColor ?? '#ff0000';
        this._endColor = opts.endColor ?? '#0000ff';
        this._align = opts.align ?? 'left';
    }

    setText(text: string): void {
        this._text = text;
        this.markDirty();
    }

    setColors(start: string, end: string): void {
        this._startColor = start;
        this._endColor = end;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0 || !this._text) return;

        const attrs = styleToCellAttrs(this._style);

        // Without color support: render plain text with alignment applied
        if (!caps.color) {
            const plainChars = Array.from(this._text).slice(0, width);
            const plainLen = plainChars.length;
            let plainOffsetX = 0;
            if (this._align === 'center') plainOffsetX = Math.floor((width - plainLen) / 2);
            else if (this._align === 'right') plainOffsetX = width - plainLen;
            plainOffsetX = Math.max(0, plainOffsetX);
            screen.writeString(x + plainOffsetX, y, plainChars.join(''), attrs);
            return;
        }

        const startRgb = hexToRgb(this._startColor);
        const endRgb = hexToRgb(this._endColor);

        const chars = Array.from(this._text).slice(0, width);
        const len = chars.length;

        // Alignment offset
        let offsetX = 0;
        if (this._align === 'center') offsetX = Math.floor((width - len) / 2);
        else if (this._align === 'right') offsetX = width - len;
        offsetX = Math.max(0, offsetX);

        for (let i = 0; i < chars.length; i++) {
            const t = len > 1 ? i / (len - 1) : 0;

            let fg: import('@termuijs/core').Color;

            if (startRgb && endRgb) {
                const [r, g, b] = lerpRgb(startRgb, endRgb, t);
                fg = { type: 'rgb', r, g, b };
            } else if (startRgb) {
                // Fallback: use start color parsed as hex
                fg = parseColor(this._startColor) ?? attrs.fg;
            } else {
                fg = attrs.fg;
            }

            screen.setCell(x + offsetX + i, y, { char: chars[i] ?? ' ', ...attrs, fg });
        }
    }
}
