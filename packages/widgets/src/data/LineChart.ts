// ─────────────────────────────────────────────────────
// @termuijs/widgets — LineChart widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { filterFinite } from './utils.js';

export interface LineChartOptions {
    /** Color of the plotted points/lines */
    color?: Color;
    /** Show Y-axis labels */
    showYAxis?: boolean;
    /** Show X-axis labels */
    showXAxis?: boolean;
    /** Label for the Y axis */
    yLabel?: string;
    /** Maximum Y value (auto if not set) */
    max?: number;
    /** Minimum Y value (auto if not set) */
    min?: number;
}

// Unicode point character; ASCII fallback
const POINT_CHAR_UNICODE = '●';
const POINT_CHAR_ASCII = '*';

/**
 * LineChart — ASCII/Unicode line plot for a series of numbers.
 *
 * Normalizes data to the available height, samples to fit width.
 * Plots points with simple vertical bar connectors between adjacent points.
 */
export class LineChart extends Widget {
    private _data: number[];
    private _color: Color;
    private _showYAxis: boolean;
    private _showXAxis: boolean;
    private _yLabel: string;
    private _max?: number;
    private _min?: number;

    constructor(data: number[], style: Partial<Style> = {}, opts: LineChartOptions = {}) {
        super(style);
        this._data = filterFinite(data);
        this._color = opts.color ?? { type: 'named', name: 'cyan' };
        this._showYAxis = opts.showYAxis ?? false;
        this._showXAxis = opts.showXAxis ?? false;
        this._yLabel = opts.yLabel ?? '';
        this._max = opts.max;
        this._min = opts.min;
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
        let { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._data.length === 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Reserve rows for X axis
        const plotHeight = this._showXAxis ? Math.max(1, height - 1) : height;
        // Reserve cols for Y axis
        const yAxisWidth = this._showYAxis ? 5 : 0;
        const plotWidth = Math.max(1, width - yAxisWidth);
        const plotX = x + yAxisWidth;

        // Compute range
        const min = this._min ?? Math.min(...this._data);
        const max = this._max ?? Math.max(...this._data);
        const range = max - min || 1;

        // Sample data to fit plotWidth
        const samples: number[] = [];
        for (let col = 0; col < plotWidth; col++) {
            const idx = Math.floor((col / plotWidth) * this._data.length);
            const val = this._data[Math.min(idx, this._data.length - 1)];
            samples.push(val ?? min);
        }

        // Map value to row (row 0 = top = max)
        const toRow = (v: number): number => {
            const norm = (v - min) / range;
            return Math.max(0, Math.min(plotHeight - 1, Math.round((1 - norm) * (plotHeight - 1))));
        };

        // Render Y axis
        if (this._showYAxis && yAxisWidth > 0) {
            for (let row = 0; row < plotHeight; row++) {
                const v = plotHeight > 1 ? max - (row / (plotHeight - 1)) * range : max;
                if (row === 0 || row === plotHeight - 1) {
                    const label = v.toFixed(0).padStart(yAxisWidth - 1, ' ');
                    screen.writeString(x, y + row, label + '┤', { ...attrs, dim: true });
                } else {
                    screen.writeString(x + yAxisWidth - 1, y + row, '│', { ...attrs, dim: true });
                }
            }
        }

        // Render points and connectors
        const pointChar = caps.unicode ? POINT_CHAR_UNICODE : POINT_CHAR_ASCII;

        let prevRow: number | null = null;
        for (let col = 0; col < samples.length; col++) {
            const val = samples[col];
            if (val === undefined) continue;
            const row = toRow(val);

            // Draw vertical connector from prev point to current
            if (prevRow !== null && Math.abs(row - prevRow) > 1) {
                const top = Math.min(prevRow, row) + 1;
                const bottom = Math.max(prevRow, row);
                for (let r = top; r < bottom; r++) {
                    screen.setCell(plotX + col, y + r, { char: '│', fg: this._color, dim: true });
                }
            }

            // Draw point
            screen.setCell(plotX + col, y + row, { char: pointChar, fg: this._color });

            prevRow = row;
        }

        // X axis
        if (this._showXAxis) {
            const axisY = y + height - 1;
            for (let col = 0; col < plotWidth; col++) {
                screen.setCell(plotX + col, axisY, { char: '─', ...attrs, dim: true });
            }
            if (yAxisWidth > 0) {
                screen.setCell(plotX - 1, axisY, { char: '└', ...attrs, dim: true });
            }
        }
    }
}
