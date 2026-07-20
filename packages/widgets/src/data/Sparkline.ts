// ─────────────────────────────────────────────────────
// @termuijs/widgets — Sparkline widget (braille chart)
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { BrailleCanvas } from './BrailleCanvas.js';
import { filterFinite } from './utils.js';

export interface SparklineOptions {
    /** Color of the sparkline */
    color?: Color;

    /** Show min/max labels */
    showRange?: boolean;

    /** Rendering style */
    marker?: 'block' | 'braille';
}

// Sparkline characters (8 levels per cell, bottom to top)
// Falls back to ASCII digits when unicode is not available.
const SPARK_CHARS_UNICODE = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const SPARK_CHARS_ASCII = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * Sparkline — a compact inline chart showing a data trend.
 *
 * Example:
 *   Latency ▂▃▅▇▅▃▂▁▃▅█▅▃
 */
export class Sparkline extends Widget {
    private _label: string;
    private _data: number[] = [];
    private _color: Color;
    private _showRange: boolean;
    private _marker: 'block' | 'braille';
    constructor(label: string, style: Partial<Style> = {}, opts: SparklineOptions = {}) {
        super(style);
        this._label = label;
        this._color = opts.color ?? { type: 'named', name: 'cyan' };
        this._showRange = opts.showRange ?? false;
        this._marker = opts.marker ?? 'block';
    }

    setData(data: number[]): void {
        this._data = filterFinite(data);
        this.markDirty();
    }

    pushValue(value: number): void {
        this._data.push(Number.isFinite(value) ? value : 0);
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const labelStr = this._label + ' ';
        const labelWidth = labelStr.length;

        // Render label
        screen.writeString(x, y, labelStr, { ...attrs, bold: true });

        // Available sparkline width
        const sparkWidth = width - labelWidth;
        if (sparkWidth <= 0 || this._data.length === 0) return;

        // Take the most recent data points that fit
        const data = this._data.slice(-sparkWidth);

        // Normalize data to 0–7 range
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        if (caps.unicode && this._marker === 'braille') {
    const canvas = new BrailleCanvas({
        width: sparkWidth * 2,
        height: 4,
        color: this._color,
    });

    for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - min) / range;

        const barHeight = Math.max(
            1,
            Math.ceil(normalized * 4),
        );
      
        for (let py = 0; py < barHeight; py++) {
            canvas.drawPixel(
                i * 2,
                3 - py,
            );

            canvas.drawPixel(
                i * 2 + 1,
                3 - py,
            );
        }
    }

    canvas.updateRect({
        x: x + labelWidth,
        y,
        width: sparkWidth,
        height: 1,
    });

    canvas.render(screen);

    return;
}

        const sparkChars = caps.unicode ? SPARK_CHARS_UNICODE : SPARK_CHARS_ASCII;
        for (let i = 0; i < data.length; i++) {
            const normalized = (data[i] - min) / range;
            const charIdx = Math.min(7, Math.round(normalized * 7));
            screen.setCell(x + labelWidth + i, y, {
                char: sparkChars[charIdx],
                fg: this._color,
            });
        }

        // Optional range labels on second line
        if (this._showRange && height > 1) {
            const rangeStr = `${min.toFixed(0)}–${max.toFixed(0)}`;
            screen.writeString(x + labelWidth, y + 1, rangeStr, {
                ...attrs,
                dim: true,
            });
        }
    }
}
