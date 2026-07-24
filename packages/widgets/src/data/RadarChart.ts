// ─────────────────────────────────────────────────────
// @termuijs/widgets — RadarChart (Self-Contained)
// ─────────────────────────────────────────────────────

import { Widget } from '../base/Widget.js';
import { type Style, type Color, Screen } from '@termuijs/core';
import { filterFinite } from './utils.js';

export interface RadarSeries {
    label: string;
    /** One value per axis, range [0, 1] */
    values: number[];
    color?: Color;
}

export interface RadarChartOptions {
    /** Axis names, one per spoke */
    axes?: string[];
    lineColor?: Color;
}

export class RadarChart extends Widget {
    private series: RadarSeries[] = [];
    private options: RadarChartOptions;

    constructor(style?: Partial<Style>, opts?: RadarChartOptions) {
        super(style);
        this.options = opts || {};
    }

    setSeries(series: RadarSeries[]): void {
        this.series = series.map(s => ({ ...s, values: filterFinite(s.values) }));
        this.markDirty();
    }

    protected override _renderSelf(screen: Screen): void {
        if (!this.rect || this.series.length === 0) return;

        const { x, y, width, height } = this.rect;
        const cx = Math.floor(x + width / 2);
        const cy = Math.floor(y + height / 2);
        // Standard radius calculation
        const maxR = Math.min(width / 2, height / 2) - 1; 

        if (maxR <= 0) return;

        for (const s of this.series) {
            const numAxes = s.values.length;
            if (numAxes === 0) continue;
            
            const points = s.values.map((val, i) => {
                const theta = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
                const clampedVal = Math.max(0, Math.min(1, val));
                return {
                    // Multiply X by 2 to compensate for tall terminal character aspect ratio
                    px: Math.floor(cx + clampedVal * maxR * Math.cos(theta) * 2),
                    py: Math.floor(cy + clampedVal * maxR * Math.sin(theta))
                };
            });

            // Connect the points using Bresenham's line algorithm directly on the screen
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                this.drawLine(screen, p1.px, p1.py, p2.px, p2.py, s.color || this.options.lineColor);
            }
        }

        this.renderLabels(screen, x, y, width, height);
    }

    private drawLine(screen: Screen, x0: number, y0: number, x1: number, y1: number, color?: Color) {
        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = x0 < x1 ? 1 : -1;
        let sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            screen.writeString(x0, y0, '*', { fg: color });
            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    private renderLabels(screen: Screen, x: number, y: number, width: number, height: number) {
        if (!this.options.axes || this.series.length === 0) return;
        
        const numAxes = this.options.axes.length;
        const cx = Math.floor(x + width / 2);
        const cy = Math.floor(y + height / 2);
        const maxR = Math.min(width / 2, height / 2) - 1;

        for (let i = 0; i < numAxes; i++) {
            const label = this.options.axes[i];
            if (!label) continue;
            
            const theta = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
            const lx = Math.floor(cx + maxR * Math.cos(theta) * 2.2); 
            const ly = Math.floor(cy + maxR * Math.sin(theta) * 1.2);
            
            // Clamp the X coordinate to prevent horizontal clipping
            const rawX = lx - Math.floor(label.length / 2);
            const startX = Math.max(x, Math.min(x + width - label.length, rawX));
            
            // Clamp the Y coordinate to prevent vertical clipping (fixes "Speed" disappearing)
            const startY = Math.max(y, Math.min(y + height - 1, ly));
            
            screen.writeString(startX, startY, label);
        }
    }
}