// ─────────────────────────────────────────────────────
// @termuijs/widgets — BulletChart widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { validateFinite } from './utils.js';

export interface BulletRange {
    to: number;
    color?: Color;
}

export interface BulletChartOptions {
    max?: number;
    ranges?: BulletRange[];
    valueColor?: Color;
    targetColor?: Color;
    label?: string;
}

/**
 * BulletChart — a metric display with target marker and qualitative range bands.
 */
export class BulletChart extends Widget {
    private _value: number = 0;
    private _target: number = 0;
    private _max: number;
    private _ranges: BulletRange[];
    private _valueColor: Color;
    private _targetColor: Color;
    private _label: string;

    constructor(style: Partial<Style> = {}, opts: BulletChartOptions = {}) {
        super(style);
        this._max = opts.max !== undefined && opts.max > 0 ? opts.max : 100;
        this._ranges = [...(opts.ranges ?? [])].sort((a, b) => a.to - b.to);
        this._valueColor = opts.valueColor ?? { type: 'named', name: 'cyan' };
        this._targetColor = opts.targetColor ?? { type: 'named', name: 'white' };
        this._label = opts.label ?? '';
    }

    setValue(value: number): void {
        this._value = validateFinite(value, 0, 0, this._max);
        this.markDirty();
    }

    setTarget(target: number): void {
        this._target = validateFinite(target, 0, 0, this._max);
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const labelStr = this._label ? this._label + ' ' : '';
        const labelWidth = stringWidth(labelStr);
        const barWidth = Math.max(0, width - labelWidth);

        if (this._label) {
            screen.writeString(x, y, labelStr, { ...attrs, bold: true });
        }

        if (barWidth <= 0) return;

        const valueCells = Math.max(0, Math.min(barWidth, Math.round((this._value / this._max) * barWidth)));
        const targetCell = Math.max(0, Math.min(barWidth - 1, Math.round((this._target / this._max) * barWidth)));

        const barX = x + labelWidth;

        for (let i = 0; i < barWidth; i++) {
            const cellValue = (i / barWidth) * this._max;
            let rangeColor: Color | undefined = undefined;
            for (const range of this._ranges) {
                if (cellValue <= range.to) {
                    rangeColor = range.color;
                    break;
                }
            }

            let char = ' ';
            let fg = attrs.fg;
            let bg = rangeColor ?? attrs.bg;

            if (caps.unicode) {
                if (i === targetCell) {
                    char = '│';
                    fg = this._targetColor;
                } else if (i < valueCells) {
                    char = '▄';
                    fg = this._valueColor;
                } else {
                    char = ' ';
                }
            } else {
                // ASCII Fallback
                if (i === targetCell) {
                    char = '|';
                    fg = this._targetColor;
                } else if (i < valueCells) {
                    char = '=';
                    fg = this._valueColor;
                } else {
                    char = '-';
                    if (!rangeColor) {
                        fg = { type: 'named', name: 'brightBlack' };
                    }
                }
            }

            screen.setCell(barX + i, y, { char, fg, bg });
        }
    }
}
