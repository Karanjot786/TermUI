// ─────────────────────────────────────────────────────
// @termuijs/widgets — Chart widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth, parseColor, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { BrailleCanvas } from './BrailleCanvas.js';

export interface ChartSeries {
    label: string;
    color: Color | string;
    data: number[];
}

export interface ChartOptions {
    type?: 'line' | 'bar' | 'scatter';
    series: ChartSeries[];
    showAxes?: boolean;
}

/**
 * Chart — a robust multi-series widget for rendering line, bar, or scatter plots using braille sub-cells.
 */
export class Chart extends Widget {
    private _type: 'line' | 'bar' | 'scatter';
    private _series: ChartSeries[];
    private _showAxes: boolean;

    constructor(opts: ChartOptions, style: Partial<Style> = {}) {
        super(style);
        this._type = opts.type ?? 'line';
        this._series = opts.series || [];
        this._showAxes = opts.showAxes ?? false;
    }

    setSeries(series: ChartSeries[]): void {
        this._series = series;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._series.length === 0) return;

        const attrs = styleToCellAttrs(this._style);
        
        let min = Infinity;
        let max = -Infinity;
        let maxDataLength = 0;

        for (const s of this._series) {
            maxDataLength = Math.max(maxDataLength, s.data.length);
            for (const val of s.data) {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }

        if (min === Infinity) min = 0;
        if (max === -Infinity) max = 1;
        if (min === max) {
            max += 1; // Avoid divide by zero
        }

        let chartX = x;
        let chartY = y;
        let chartWidth = width;
        let chartHeight = height;

        const maxStr = max.toFixed(1);
        const minStr = min.toFixed(1);
        
        // If axes are shown, reserve space for Y-axis (labels + tick) and X-axis (line)
        if (this._showAxes) {
            const yAxisLabelWidth = Math.max(stringWidth(maxStr), stringWidth(minStr)) + 1; // +1 for the tick mark e.g. '┤'
            chartX = x + yAxisLabelWidth;
            chartWidth = width - yAxisLabelWidth;
            chartHeight = height - 1; // Reserve bottom row for X-axis
            
            if (chartWidth <= 0 || chartHeight <= 0) return;

            // Draw Y-axis line
            for (let r = 0; r < chartHeight; r++) {
                screen.setCell(chartX - 1, y + r, { char: '│', ...attrs });
            }
            // Draw X-axis line
            for (let c = 0; c < chartWidth; c++) {
                screen.setCell(chartX + c, y + chartHeight, { char: '─', ...attrs });
            }
            // Draw origin corner
            screen.setCell(chartX - 1, y + chartHeight, { char: '└', ...attrs });

            // Draw Y-axis labels
            screen.writeString(x, y, maxStr.padStart(yAxisLabelWidth - 1) + '┤', attrs);
            screen.writeString(x, y + chartHeight - 1, minStr.padStart(yAxisLabelWidth - 1) + '┤', attrs);
        }

        if (chartWidth <= 0 || chartHeight <= 0) return;

        const canvasWidth = chartWidth * 2;
        const canvasHeight = chartHeight * 4;

        const canvas = new BrailleCanvas({
            width: canvasWidth,
            height: canvasHeight
        });

        const range = max - min;
        const scaleX = maxDataLength > 1 ? (canvasWidth - 1) / (maxDataLength - 1) : 0;

        for (const series of this._series) {
            const seriesColor = typeof series.color === 'string' ? parseColor(series.color) : series.color;

            let prevPx = -1;
            let prevPy = -1;

            for (let i = 0; i < series.data.length; i++) {
                const val = series.data[i];
                const normalizedY = (val - min) / range;
                
                let px: number;
                if (this._type === 'bar') {
                    // Bars take up space, compute bar width
                    const barWidth = Math.max(1, Math.floor(canvasWidth / maxDataLength));
                    px = i * barWidth;
                    const py = Math.floor(normalizedY * (canvasHeight - 1));
                    const invertedY = (canvasHeight - 1) - py;
                    
                    canvas.fillRect(px, invertedY, barWidth - 1, py + 1, seriesColor);
                } else {
                    px = Math.round(i * scaleX);
                    const py = Math.floor(normalizedY * (canvasHeight - 1));
                    const invertedY = (canvasHeight - 1) - py;

                    if (this._type === 'scatter') {
                        canvas.drawPixel(px, invertedY, seriesColor);
                        canvas.drawPixel(px + 1, invertedY, seriesColor);
                        canvas.drawPixel(px, invertedY + 1, seriesColor);
                        canvas.drawPixel(px + 1, invertedY + 1, seriesColor);
                    } else if (this._type === 'line') {
                        if (prevPx !== -1) {
                            canvas.drawLine(prevPx, prevPy, px, invertedY, seriesColor);
                        } else {
                            canvas.drawPixel(px, invertedY, seriesColor);
                        }
                    }
                    prevPx = px;
                    prevPy = invertedY;
                }
            }
        }

        canvas.updateRect({
            x: chartX,
            y: chartY,
            width: chartWidth,
            height: chartHeight
        });

        canvas.render(screen);
        
        // Draw Legend (top right of chart space if multiple series)
        if (this._series.length > 1 && chartHeight > 2) {
            let legendX = chartX + chartWidth;
            for (let i = this._series.length - 1; i >= 0; i--) {
                const s = this._series[i];
                const label = ` ■ ${s.label} `;
                legendX -= stringWidth(label);
                if (legendX < chartX) break; // Doesn't fit
                const color = typeof s.color === 'string' ? parseColor(s.color) : s.color;
                
                // Print the square in color
                screen.writeString(legendX, y, ' ■ ', { ...attrs, fg: color });
                // Print label
                screen.writeString(legendX + 3, y, s.label + ' ', attrs);
            }
        }
    }
}
