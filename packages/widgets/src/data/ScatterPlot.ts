import { Widget } from '../base/Widget.js';
import { type Style, type Color, Screen, caps, truncate } from '@termuijs/core';
import { filterFinite, validateFinite } from './utils.js';

export interface ScatterPoint {
    x: number;
    y: number;
    color?: Color;
}

export interface ScatterPlotOptions {
    /** X axis label */
    xLabel?: string;
    /** Y axis label */
    yLabel?: string;
    /** Point marker. Default: '•' with ASCII fallback '.' */
    marker?: string;
    pointColor?: Color;
}

export class ScatterPlot extends Widget {
    private points: ScatterPoint[] = [];
    private options: ScatterPlotOptions;

    constructor(style?: Partial<Style>, opts?: ScatterPlotOptions) {
        super(style);
        this.options = opts || {};
    }

    setData(points: ScatterPoint[]): void {
        this.points = points.map(p => ({
            x: validateFinite(p.x, 0),
            y: validateFinite(p.y, 0),
            color: p.color,
        }));
        this.markDirty();
    }

    protected override _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();
        if (width < 2 || height < 2) return;

        const isUnicode = caps.unicode;
        const vLine = isUnicode ? '│' : '|';
        const hLine = isUnicode ? '─' : '-';
        const corner = isUnicode ? '└' : '+';

        const plotX = x + 1;
        const plotY = y;
        const plotW = width - 1;
        const plotH = height - 1;
        const originY = y + height - 1;

        // Render Y-Axis
        for (let i = plotY; i < originY; i++) {
            screen.writeString(x, i, vLine, { fg: this.options.pointColor });
        }

        // Render X-Axis
        for (let i = plotX; i < x + width; i++) {
            screen.writeString(i, originY, hLine, { fg: this.options.pointColor });
        }

        // Render Origin Corner
        screen.writeString(x, originY, corner, { fg: this.options.pointColor });

        // Render Labels
        if (this.options.yLabel) {
            screen.writeString(x + 1, y, truncate(this.options.yLabel, Math.max(0, width - 1)));
        }
        if (this.options.xLabel) {
            const xL = truncate(this.options.xLabel, Math.max(0, width - 1));
            const startX = Math.max(plotX, x + width - xL.length);
            screen.writeString(startX, originY, xL);
        }

        // Plot Points
        if (this.points.length === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const p of this.points) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }

        // Prevent division by zero if all points have the same coordinate
        if (minX === maxX) { minX -= 1; maxX += 1; }
        if (minY === maxY) { minY -= 1; maxY += 1; }

        const marker = this.options.marker ?? (isUnicode ? '•' : '.');

        for (const p of this.points) {
            const normalizedX = (p.x - minX) / (maxX - minX);
            const normalizedY = (p.y - minY) / (maxY - minY);

            const px = Math.floor(plotX + normalizedX * (plotW - 1));
            const py = Math.floor(originY - 1 - normalizedY * (plotH - 1));

            // Ensure points remain inside drawing bounds
            if (px >= plotX && px < x + width && py >= plotY && py < originY) {
                screen.writeString(px, py, marker, { fg: p.color || this.options.pointColor });
            }
        }
    }
}
