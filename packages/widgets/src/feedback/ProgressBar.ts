// ─────────────────────────────────────────────────────
// @termuijs/widgets — ProgressBar widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, type Color, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface ProgressBarOptions {
    /** Current value (0–1) */
    value?: number;
    /** Character for the filled portion */
    fillChar?: string;
    /** Character for the empty portion */
    emptyChar?: string;
    /** Color of the filled portion */
    fillColor?: Color;
    /** Show percentage label */
    showLabel?: boolean;
    /** Label format: 'percent' | 'fraction' | 'custom' */
    labelFormat?: 'percent' | 'fraction';
    /** Total for fraction display */
    total?: number;
}

/**
 * ProgressBar — horizontal progress indicator.
 *
 * Supports:
 * - Configurable fill/empty characters
 * - Custom fill color
 * - Percentage or fraction label
 * - Smooth animation-ready value changes
 */
export class ProgressBar extends Widget {
    private _value: number;
    private _fillChar: string;
    private _emptyChar: string;
    private _fillColor: Color;
    private _showLabel: boolean;
    private _labelFormat: 'percent' | 'fraction';
    private _total: number;

    constructor(style: Partial<Style> = {}, options: ProgressBarOptions = {}) {
        super({ height: 1, ...style });
        this._value = Math.max(0, Math.min(1, options.value ?? 0));
        this._fillChar = options.fillChar ?? (caps.unicode ? '█' : '#');
        this._emptyChar = options.emptyChar ?? (caps.unicode ? '░' : '-');
        this._fillColor = options.fillColor ?? { type: 'named', name: 'green' };
        this._showLabel = options.showLabel ?? true;
        this._labelFormat = options.labelFormat ?? 'percent';
        this._total = options.total ?? 100;
    }

    /** Set progress value (0–1) */
    setValue(value: number): void {
        this._value = Math.max(0, Math.min(1, value));
        this.markDirty();
    }

    get value(): number { return this._value; }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Label
        let label = '';
        if (this._showLabel) {
            if (this._labelFormat === 'percent') {
                label = ` ${Math.round(this._value * 100)}%`;
            } else {
                label = ` ${Math.round(this._value * this._total)}/${this._total}`;
            }
        }

        const barWidth = Math.max(0, width - label.length);
        const filled = this._value <= 0 ? 0 : Math.round(barWidth * this._value);
        const empty = barWidth - filled;

        // Render bar
        for (let i = 0; i < filled; i++) {
            screen.setCell(x + i, y, { char: this._fillChar, ...attrs, fg: this._fillColor });
        }
        for (let i = 0; i < empty; i++) {
            screen.setCell(x + filled + i, y, { char: this._emptyChar, ...attrs, dim: true });
        }

        // Render label
        if (label) {
            screen.writeString(x + barWidth, y, label, { ...attrs, bold: true });
        }
    }
}
