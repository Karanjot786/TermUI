// ─────────────────────────────────────────────────────
// @termuijs/widgets — PieChart widget
//
// Renders proportional slices using block characters
// (Unicode) or a horizontal bar chart (ASCII fallback),
// with a legend below.
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type Color,
    styleToCellAttrs,
    caps,
    parseColor,
    truncate,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface PieSlice {
    label: string;
    value: number;
    color: string | Color;
}

export interface PieChartOptions {
    slices?: PieSlice[];
    style?: Partial<Style>;
    showLegend?: boolean;
}

const LEGEND_BULLET_UNICODE = '\u25CF';
const LEGEND_BULLET_ASCII = '*';

export class PieChart extends Widget {
    private _slices: PieSlice[];
    private _showLegend: boolean;

    constructor(options: PieChartOptions = {}) {
        super(options.style);
        this._slices = options.slices ?? [];
        this._showLegend = options.showLegend ?? true;
    }

    get slices(): ReadonlyArray<PieSlice> { return this._slices; }

    setSlices(slices: PieSlice[]): void {
        this._slices = slices;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        if (this._slices.length === 0) return;

        const totalHeight = this._showLegend ? Math.max(0, height - this._slices.length) : height;
        if (totalHeight <= 0) {
            this._renderLegend(screen, x, y, width, height);
            return;
        }

        if (caps.unicode) {
            this._renderPie(screen, x, y, width, totalHeight);
        } else {
            this._renderBars(screen, x, y, width, totalHeight);
        }

        if (this._showLegend) {
            this._renderLegend(screen, x, y + totalHeight, width, height - totalHeight);
        }
    }

    // ── Unicode pie ──────────────────────────────────

    private _renderPie(screen: Screen, ox: number, oy: number, width: number, height: number): void {
        const total = this._total();
        if (total <= 0) return;

        const cx = (width - 1) / 2;
        const cy = (height - 1) / 2;
        // Each cell is ~2x taller than wide; scale vertical to match.
        const radius = Math.min(cx, cy * 2);

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const dx = col - cx;
                const dy = (row - cy) * 2;
                const r = Math.sqrt(dx * dx + dy * dy);
                if (r > radius) continue;

                const slice = this._findSliceAt(dx, dy, total);
                if (!slice) continue;
                screen.setCell(ox + col, oy + row, { char: '\u2588', fg: this._colorOf(slice) });
            }
        }
    }

    private _findSliceAt(dx: number, dy: number, total: number): PieSlice | null {
        // 0 rad = up, clockwise
        const angle = Math.atan2(dx, -dy);
        const normalized = (angle + Math.PI * 2) % (Math.PI * 2);
        let cumulative = 0;
        for (const slice of this._slices) {
            if (slice.value <= 0) continue;
            const sliceAngle = (slice.value / total) * Math.PI * 2;
            if (normalized < cumulative + sliceAngle) return slice;
            cumulative += sliceAngle;
        }
        return this._slices[this._slices.length - 1] ?? null;
    }

    // ── ASCII bar fallback ──────────────────────────

    private _renderBars(screen: Screen, ox: number, oy: number, width: number, height: number): void {
        const total = this._total();
        if (total <= 0) return;
        const maxValue = Math.max(...this._slices.map(s => s.value));
        if (maxValue <= 0) return;

        const usable = Math.max(1, width - 8);
        for (let i = 0; i < this._slices.length && i < height; i++) {
            const slice = this._slices[i];
            if (!slice) continue;
            const barLen = Math.round((slice.value / maxValue) * usable);
            const pct = Math.round((slice.value / total) * 100);
            const line = '#'.repeat(barLen).padEnd(usable) + ` ${String(pct).padStart(3)}%`;
            screen.writeString(ox, oy + i, line.slice(0, width), { ...styleToCellAttrs(this._style), fg: this._colorOf(slice) });
        }
    }

    // ── Legend ───────────────────────────────────────

    private _renderLegend(screen: Screen, ox: number, oy: number, width: number, maxRows: number): void {
        const total = this._total();
        const bullet = caps.unicode ? LEGEND_BULLET_UNICODE : LEGEND_BULLET_ASCII;
        const attrs = styleToCellAttrs(this._style);
        for (let i = 0; i < this._slices.length && i < maxRows; i++) {
            const slice = this._slices[i];
            if (!slice) continue;
            const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            const text = `${bullet} ${slice.label} ${pct}%`;
            screen.writeString(ox, oy + i, truncate(text, width), { ...attrs, fg: this._colorOf(slice) });
        }
    }

    private _total(): number {
        return this._slices.reduce((s, x) => s + (x.value > 0 ? x.value : 0), 0);
    }

    private _colorOf(slice: PieSlice): Color {
        return typeof slice.color === 'string' ? parseColor(slice.color) : slice.color;
    }
}
