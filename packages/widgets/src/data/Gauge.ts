// ─────────────────────────────────────────────────────
// @termuijs/widgets — Gauge widget (label + bar + value)
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { validateFinite } from './utils.js';

export interface GaugeOptions {
    /** Color of the filled portion */
    color?: Color;
    /** Show percentage label */
    showLabel?: boolean;
}

/**
 * Gauge — a self-contained metric display with label, bar, and value.
 *
 * Example:
 *   CPU ████████░░░░ 65%
 */
export class Gauge extends Widget {
    private _label: string;
    private _value: number = 0;
    private _color: Color;
    private _showLabel: boolean;

    constructor(label: string, style: Partial<Style> = {}, opts: GaugeOptions = {}) {
        super(style);
        this._label = label;
        this._color = opts.color ?? { type: 'named', name: 'green' };
        this._showLabel = opts.showLabel ?? true;
    }

    setValue(value: number): void {
        this._value = validateFinite(value, 0, 0, 1);
        this.markDirty();
    }

    getValue(): number {
        return this._value;
    }

    setLabel(label: string): void {
        this._label = label;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

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
                fg: i < filled ? this._color : { type: 'named', name: 'brightBlack' },
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
