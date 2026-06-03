// ─────────────────────────────────────────────────────
// @termuijs/widgets — AreaChart widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps, stringWidth, BRAILLE_DOTS, BRAILLE_OFFSET } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface AreaChartOptions {
    xLabel?: string;
    yLabel?: string;
    lineColor?: Color;
    fillColor?: Color;
    showLine?: boolean;
}

type CanvasLayer = 'fill' | 'line';

interface BrailleCell {
    fillBits: number;
    lineBits: number;
}

class BrailleCanvas {
    private _cellWidth: number;
    private _cellHeight: number;
    private _cells: BrailleCell[];

    constructor(width: number, height: number) {
        this._cellWidth = Math.max(1, Math.ceil(width / 2));
        this._cellHeight = Math.max(1, Math.ceil(height / 4));
        this._cells = Array.from({ length: this._cellWidth * this._cellHeight }, () => ({
            fillBits: 0,
            lineBits: 0,
        }));
    }

    drawPixel(x: number, y: number, layer: CanvasLayer = 'fill'): void {
        if (x < 0 || y < 0) return;

        const cellX = Math.floor(x / 2);
        const cellY = Math.floor(y / 4);
        if (cellX < 0 || cellY < 0 || cellX >= this._cellWidth || cellY >= this._cellHeight) return;

        const dotRow = y % 4;
        const dotCol = x % 2;
        const dotBits = BRAILLE_DOTS[dotRow];
        if (!dotBits) return;

        const bit = dotCol === 0 ? dotBits[0] : dotBits[1];
        const cell = this._cells[cellY * this._cellWidth + cellX];
        if (!cell) return;

        if (layer === 'line') {
            cell.lineBits |= bit;
        } else {
            cell.fillBits |= bit;
        }
    }

    drawLine(x0: number, y0: number, x1: number, y1: number, layer: CanvasLayer = 'line'): void {
        let cx = x0;
        let cy = y0;
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.drawPixel(cx, cy, layer);
            if (cx === x1 && cy === y1) break;

            const e2 = err * 2;
            if (e2 > -dy) {
                err -= dy;
                cx += sx;
            }
            if (e2 < dx) {
                err += dx;
                cy += sy;
            }
        }
    }

    render(
        screen: Screen,
        x: number,
        y: number,
        fillColor: Color,
        lineColor: Color,
        attrs: ReturnType<typeof styleToCellAttrs>,
        asciiFallback: boolean,
    ): void {
        for (let cy = 0; cy < this._cellHeight; cy++) {
            for (let cx = 0; cx < this._cellWidth; cx++) {
                const cell = this._cells[cy * this._cellWidth + cx];
                if (!cell) continue;

                const unionBits = cell.fillBits | cell.lineBits;
                if (unionBits === 0) continue;

                const char = asciiFallback
                    ? '#'
                    : String.fromCharCode(BRAILLE_OFFSET + unionBits);

                const fg = cell.lineBits !== 0 ? lineColor : fillColor;
                screen.setCell(x + cx, y + cy, { char, ...attrs, fg });
            }
        }
    }
}

export class AreaChart extends Widget {
    private _data: number[] = [];
    private _xLabel: string;
    private _yLabel: string;
    private _lineColor: Color;
    private _fillColor: Color;
    private _showLine: boolean;

    constructor(style: Partial<Style> = {}, opts: AreaChartOptions = {}) {
        super(style);
        this._xLabel = opts.xLabel ?? '';
        this._yLabel = opts.yLabel ?? '';
        this._lineColor = opts.lineColor ?? { type: 'named', name: 'cyan' };
        this._fillColor = opts.fillColor ?? { type: 'named', name: 'brightBlack' };
        this._showLine = opts.showLine ?? true;
    }

    setData(values: number[]): void {
        this._data = values;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const topLabelRows = this._yLabel ? 1 : 0;
        const bottomLabelRows = this._xLabel ? 1 : 0;
        const plotY = y + topLabelRows;
        const plotHeight = height - topLabelRows - bottomLabelRows;

        if (this._yLabel) {
            screen.writeString(x, y, this._yLabel.slice(0, width), attrs);
        }

        if (this._xLabel) {
            const labelWidth = stringWidth(this._xLabel);
            const labelX = x + Math.max(0, width - labelWidth);
            screen.writeString(labelX, y + height - 1, this._xLabel.slice(0, width), attrs);
        }

        if (plotHeight <= 0 || this._data.length === 0) return;

        const min = Math.min(...this._data);
        const max = Math.max(...this._data);
        const range = max - min || 1;

        const pixelWidth = width * 2;
        const pixelHeight = plotHeight * 4;
        const fillCanvas = new BrailleCanvas(pixelWidth, pixelHeight);
        const lineCanvas = new BrailleCanvas(pixelWidth, pixelHeight);

        const sampleValueAt = (pixelX: number): number => {
            if (this._data.length === 1) return this._data[0] ?? min;

            const position = (pixelX / Math.max(1, pixelWidth - 1)) * (this._data.length - 1);
            const leftIndex = Math.floor(position);
            const rightIndex = Math.min(this._data.length - 1, leftIndex + 1);
            const t = position - leftIndex;
            const left = this._data[leftIndex] ?? min;
            const right = this._data[rightIndex] ?? left;
            return left + (right - left) * t;
        };

        let previousX: number | null = null;
        let previousY: number | null = null;

        for (let pixelX = 0; pixelX < pixelWidth; pixelX++) {
            const value = sampleValueAt(pixelX);
            const normalized = (value - min) / range;
            const lineY = Math.max(0, Math.min(pixelHeight - 1, Math.round((1 - normalized) * (pixelHeight - 1))));

            for (let pixelY = lineY; pixelY < pixelHeight; pixelY++) {
                fillCanvas.drawPixel(pixelX, pixelY, 'fill');
            }

            if (this._showLine) {
                if (previousX !== null && previousY !== null) {
                    lineCanvas.drawLine(previousX, previousY, pixelX, lineY, 'line');
                } else {
                    lineCanvas.drawPixel(pixelX, lineY, 'line');
                }
            }

            previousX = pixelX;
            previousY = lineY;
        }

        fillCanvas.render(screen, x, plotY, this._fillColor, this._lineColor, attrs, !caps.unicode);
        if (this._showLine) {
            lineCanvas.render(screen, x, plotY, this._fillColor, this._lineColor, attrs, !caps.unicode);
        }
    }
}
