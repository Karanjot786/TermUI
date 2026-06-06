// ─────────────────────────────────────────────────────
// @termuijs/widgets — Meter widget (label + bar + value with thresholds)
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface MeterOptions {
    /** Value below this fraction renders the low color. Default: 0.25 */
    low?: number;
    /** Value at or above this fraction renders the high color. Default: 0.75 */
    high?: number;
    /** Show the percentage label. Default: true */
    showLabel?: boolean;
}

/**
 * Meter — a self-contained metric display with label, bar, and value with low/optimum/high thresholds.
 *
 * Example:
 *   Disk ████████░░░░ 65%
 *
 * Color logic:
 *   - value < low threshold → low color (red)
 *   - value >= high threshold → high color (yellow)
 *   - value between → optimum color (green)
 */
export class Meter extends Widget {
    private _label: string;
    private _value: number = 0;
    private _low: number;
    private _high: number;
    private _showLabel: boolean;

    constructor(label: string, style: Partial<Style> = {}, opts: MeterOptions = {}) {
        super(style);
        this._label = label;
        this._low = opts.low ?? 0.25;
        this._high = opts.high ?? 0.75;
        this._showLabel = opts.showLabel ?? true;
    }

    setValue(value: number): void {
        this._value = Math.max(0, Math.min(1, value));
        this.markDirty();
    }

    getValue(): number {
        return this._value;
    }

    setLabel(label: string): void {
        this._label = label;
        this.markDirty();
    }

    private _getBarColor(): Color {
        if (this._value < this._low) {
            return { type: 'named', name: 'red' };
        } else if (this._value >= this._high) {
            return { type: 'named', name: 'yellow' };
        } else {
            return { type: 'named', name: 'green' };
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const barColor = this._getBarColor();

        // Layout: "Label ████████░░░░ XX%"
        const labelStr = this._label + ' ';
        const percentStr = this._showLabel ? ` ${Math.round(this._value * 100)}%` : '';
        const labelWidth = stringWidth(labelStr);
        const percentWidth = stringWidth(percentStr);
        const barWidth = Math.max(0, width - labelWidth - percentWidth);

        // Render label
        screen.writeString(x, y, labelStr, { ...attrs, bold: true });

        // Render bar
        const filled = Math.round(barWidth * this._value);
        const barX = x + labelWidth;
        for (let i = 0; i < barWidth; i++) {
            const char = i < filled ? (caps.unicode ? '█' : '#') : (caps.unicode ? '░' : '-');
            screen.setCell(barX + i, y, {
                char,
                fg: i < filled ? barColor : { type: 'named', name: 'brightBlack' },
            });
        }

        // Render percentage
        if (this._showLabel) {
            screen.writeString(barX + barWidth, y, percentStr, {
                ...attrs,
                bold: true,
            });
        }
    }
}
