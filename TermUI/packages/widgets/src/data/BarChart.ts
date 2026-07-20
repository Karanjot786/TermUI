// ─────────────────────────────────────────────────────
// @termuijs/widgets — BarChart widget
// Grouped bar chart with vertical and horizontal modes.
// ─────────────────────────────────────────────────────

import {
    type Screen, type Style, type Color,
    styleToCellAttrs, stringWidth,
    VERTICAL_BAR_SYMBOLS, HORIZONTAL_BAR_SYMBOLS,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

// ── Types ────────────────────────────────────────────

export interface Bar {
    value: number;
    label?: string;
    color?: Color;
}

export interface BarGroup {
    label?: string;
    bars: Bar[];
}

export type BarChartDirection = 'vertical' | 'horizontal';

export interface BarChartOptions {
    /** Direction bars grow. Default: 'vertical'. */
    direction?: BarChartDirection;
    /** Width of each bar in cells. Default: 1. */
    barWidth?: number;
    /** Gap between bars in a group. Default: 1. */
    barGap?: number;
    /** Gap between groups. Default: 2. */
    groupGap?: number;
    /** Max value for scaling. Auto-detected if not set. */
    max?: number;
    /** Color for bars without a per-bar color. */
    barColor?: Color;
    /** Color for value labels. */
    valueColor?: Color;
    /** Color for text labels. */
    labelColor?: Color;
}

// ── Widget ───────────────────────────────────────────

export class BarChart extends Widget {
    private _data: BarGroup[] = [];
    private _direction: BarChartDirection;
    private _barWidth: number;
    private _barGap: number;
    private _groupGap: number;
    private _max?: number;
    private _barColor: Color;
    private _valueColor: Color;
    private _labelColor: Color;

    constructor(data: BarGroup[], style: Partial<Style> = {}, opts: BarChartOptions = {}) {
        super(style);
        this._data = data;
        this._direction = opts.direction ?? 'vertical';
        this._barWidth = opts.barWidth ?? 1;
        this._barGap = opts.barGap ?? 1;
        this._groupGap = opts.groupGap ?? 2;
        this._max = opts.max;
        this._barColor = opts.barColor ?? { type: 'named', name: 'cyan' };
        this._valueColor = opts.valueColor ?? { type: 'named', name: 'white' };
        this._labelColor = opts.labelColor ?? { type: 'named', name: 'brightBlack' };
    }

    setData(data: BarGroup[]): void {
        this._data = data;
        this.markDirty();
    }

    setMax(max: number | undefined): void {
        this._max = max;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._data.length === 0) return;

        const maxVal = this._computeMax();
        if (maxVal === 0) return;

        if (this._direction === 'vertical') {
            this._renderVertical(screen, x, y, width, height, maxVal);
        } else {
            this._renderHorizontal(screen, x, y, width, height, maxVal);
        }
    }

    private _computeMax(): number {
        if (this._max !== undefined) return this._max;
        let max = 0;
        for (const group of this._data) {
            for (const bar of group.bars) {
                if (bar.value > max) max = bar.value;
            }
        }
        return max;
    }

    // ── Vertical Rendering ───────────────────────────

    private _renderVertical(
        screen: Screen, ox: number, oy: number,
        width: number, height: number, maxVal: number,
    ): void {
        const valueRows = 1;
        const hasLabels = this._data.some(g =>
            g.bars.some(b => b.label !== undefined)
        );
        const labelRows = hasLabels ? 1 : 0;
        const hasGroupLabels = this._data.some(g => g.label !== undefined);
        const groupLabelRows = hasGroupLabels ? 1 : 0;
        const reservedRows = valueRows + labelRows + groupLabelRows;

        if (height <= reservedRows) return;

        const barAreaHeight = height - reservedRows;
        let cx = ox;

        for (let gi = 0; gi < this._data.length; gi++) {
            const group = this._data[gi];
            if (!group) continue;
            const groupStartX = cx;

            for (let bi = 0; bi < group.bars.length; bi++) {
                const bar = group.bars[bi];
                if (!bar) continue;
                if (cx + this._barWidth > ox + width) break;

                const color = bar.color ?? this._barColor;

                // Draw bar from bottom up using sub-cell symbols (8 levels per cell)
                const scaledHeight = (bar.value / maxVal) * (barAreaHeight * 8);
                let remaining = Math.round(scaledHeight);

                for (let row = barAreaHeight - 1; row >= 0; row--) {
                    if (remaining <= 0) break;
                    const level = Math.min(remaining, 8);
                    const symbol = VERTICAL_BAR_SYMBOLS[level] ?? ' ';
                    const cellY = oy + row;

                    for (let col = 0; col < this._barWidth; col++) {
                        const cellX = cx + col;
                        if (cellX < ox + width) {
                            screen.setCell(cellX, cellY, { char: symbol, fg: color });
                        }
                    }
                    remaining -= 8;
                }

                // Value text below bar
                const valStr = Math.round(bar.value).toString();
                const valX = cx + Math.floor((this._barWidth - stringWidth(valStr)) / 2);
                screen.writeString(
                    Math.max(cx, valX), oy + barAreaHeight,
                    valStr.slice(0, this._barWidth),
                    { fg: this._valueColor },
                );

                // Bar label below value
                if (hasLabels && bar.label) {
                    const label = bar.label.slice(0, this._barWidth);
                    const labelX = cx + Math.floor((this._barWidth - stringWidth(label)) / 2);
                    screen.writeString(
                        Math.max(cx, labelX), oy + barAreaHeight + valueRows,
                        label,
                        { fg: this._labelColor },
                    );
                }

                cx += this._barWidth;
                if (bi < group.bars.length - 1) cx += this._barGap;
            }

            // Group label at bottom
            if (hasGroupLabels && group.label) {
                const groupWidth = cx - groupStartX;
                const label = group.label.slice(0, groupWidth);
                const labelX = groupStartX + Math.floor((groupWidth - stringWidth(label)) / 2);
                screen.writeString(
                    Math.max(groupStartX, labelX), oy + height - 1,
                    label,
                    { fg: this._labelColor },
                );
            }

            if (gi < this._data.length - 1) cx += this._groupGap;
        }
    }

    // ── Horizontal Rendering ─────────────────────────

    private _renderHorizontal(
        screen: Screen, ox: number, oy: number,
        width: number, height: number, maxVal: number,
    ): void {
        // Compute label column width
        let maxLabelWidth = 0;
        let maxValueWidth = 0;
        for (const group of this._data) {
            for (const bar of group.bars) {
                if (bar.label) {
                    const w = stringWidth(bar.label);
                    if (w > maxLabelWidth) maxLabelWidth = w;
                }
                const vw = Math.round(bar.value).toString().length;
                if (vw > maxValueWidth) maxValueWidth = vw;
            }
        }

        const labelColWidth = maxLabelWidth > 0 ? maxLabelWidth + 1 : 0;
        const valueColWidth = maxValueWidth > 0 ? maxValueWidth + 1 : 0;
        const barAreaWidth = width - labelColWidth - valueColWidth;

        if (barAreaWidth <= 0) return;

        let cy = oy;

        for (let gi = 0; gi < this._data.length; gi++) {
            const group = this._data[gi];
            if (!group) continue;

            for (let bi = 0; bi < group.bars.length; bi++) {
                const bar = group.bars[bi];
                if (!bar) continue;

                for (let row = 0; row < this._barWidth; row++) {
                    const cellY = cy + row;
                    if (cellY >= oy + height) break;

                    // Label on first row
                    if (row === 0 && bar.label) {
                        const label = bar.label.slice(0, maxLabelWidth);
                        const padded = label.padStart(maxLabelWidth);
                        screen.writeString(ox, cellY, padded, { fg: this._labelColor });
                    }

                    // Draw horizontal bar using sub-cell symbols
                    const color = bar.color ?? this._barColor;
                    const scaledWidth = (bar.value / maxVal) * (barAreaWidth * 8);
                    let remaining = Math.round(scaledWidth);
                    const barStartX = ox + labelColWidth;

                    for (let col = 0; col < barAreaWidth; col++) {
                        if (remaining <= 0) break;
                        const level = Math.min(remaining, 8);
                        const symbol = HORIZONTAL_BAR_SYMBOLS[level] ?? ' ';
                        screen.setCell(barStartX + col, cellY, { char: symbol, fg: color });
                        remaining -= 8;
                    }

                    // Value text on first row
                    if (row === 0) {
                        const valStr = Math.round(bar.value).toString();
                        screen.writeString(
                            ox + labelColWidth + barAreaWidth, cellY,
                            ` ${valStr}`,
                            { fg: this._valueColor },
                        );
                    }
                }

                cy += this._barWidth;
                if (bi < group.bars.length - 1) cy += this._barGap;
            }

            if (gi < this._data.length - 1) cy += this._groupGap;
        }
    }
}
