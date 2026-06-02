// ─────────────────────────────────────────────────────
// @termuijs/widgets — RadarChart
// ─────────────────────────────────────────────────────

import { Widget } from '../base/Widget.js';
import { type Style, type Color, caps, Screen } from '@termuijs/core';
// Let's grab BrailleCanvas from the display folder where it likely lives!
import { BrailleCanvas } from '../display/BrailleCanvas.js'; 

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
    private canvas: BrailleCanvas;

    constructor(style?: Partial<Style>, opts?: RadarChartOptions) {
        super(style);
        this.options = opts || {};
        this.canvas = new BrailleCanvas(style);
    }

    setSeries(series: RadarSeries[]): void {
        this.series = series;
        this.markDirty();
    }

    override updateRect(rect: { x: number; y: number; width: number; height: number }): void {
        super.updateRect(rect);
        this.canvas.updateRect(rect); // Keep internal canvas synced with widget bounds
    }

    // UPDATED: Use _renderSelf to comply with the new Widget API
    protected override _renderSelf(screen: Screen): void {
        if (!this.rect || this.series.length === 0) return;

        const { x, y, width, height } = this.rect;

        if (!caps.unicode) {
            this.renderAscii(screen, x, y, width, height);
            return;
        }

        this.canvas.clear();
        
        const logicalWidth = width * 2;
        const logicalHeight = height * 4;
        const cx = logicalWidth / 2;
        const cy = logicalHeight / 2;
        const maxR = Math.min(cx, cy) - 2; 

        if (maxR <= 0) return;

        for (const s of this.series) {
            const numAxes = s.values.length;
            if (numAxes === 0) continue;
            
            const points = s.values.map((val, i) => {
                const theta = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
                const clampedVal = Math.max(0, Math.min(1, val));
                return {
                    px: Math.round(cx + clampedVal * maxR * Math.cos(theta)),
                    py: Math.round(cy + clampedVal * maxR * Math.sin(theta))
                };
            });

            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                this.drawLine(this.canvas, p1.px, p1.py, p2.px, p2.py, s.color || this.options.lineColor);
            }
        }

        // Render the internal canvas
        this.canvas.render(screen);
        this.renderLabels(screen, x, y, width, height);
    }

    private drawLine(canvas: BrailleCanvas, x0: number, y0: number, x1: number, y1: number, color?: Color) {
        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = x0 < x1 ? 1 : -1;
        let sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            canvas.drawPixel(x0, y0, color);
            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    private renderAscii(screen: Screen, x: number, y: number, width: number, height: number) {
        const cx = x + width / 2;
        const cy = y + height / 2;
        const maxR = Math.min(width / 2, height / 2) - 1;

        if (maxR <= 0) return;

        for (const s of this.series) {
            const numAxes = s.values.length;
            if (numAxes === 0) continue;
            
            for (let i = 0; i < numAxes; i++) {
                const val = Math.max(0, Math.min(1, s.values[i]));
                const theta = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
                
                const px = Math.floor(cx + val * maxR * Math.cos(theta) * 2);
                const py = Math.floor(cy + val * maxR * Math.sin(theta));
                
                screen.writeString(px, py, '*', { fg: s.color || this.options.lineColor });
            }
        }
        this.renderLabels(screen, x, y, width, height);
    }

    private renderLabels(screen: Screen, x: number, y: number, width: number, height: number) {
        if (!this.options.axes || this.series.length === 0) return;
        
        const numAxes = this.options.axes.length;
        const cx = width / 2;
        const cy = height / 2;
        const maxR = Math.min(cx, cy);

        for (let i = 0; i < numAxes; i++) {
            const label = this.options.axes[i];
            if (!label) continue;
            
            const theta = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
            const lx = Math.floor(x + cx + maxR * Math.cos(theta) * 2.2); 
            const ly = Math.floor(y + cy + maxR * Math.sin(theta) * 1.2);
            
            screen.writeString(lx - Math.floor(label.length / 2), ly, label);
        }
    }
}