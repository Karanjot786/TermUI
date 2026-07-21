// ─────────────────────────────────────────────────────
// @termuijs/widgets — HeatMap widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { filterFinite } from './utils.js';

export interface HeatMapOptions {
    /** Color for maximum value cells */
    highColor?: Color;
    /** Color for minimum value cells */
    lowColor?: Color;
    /** Row labels (left side) */
    rowLabels?: string[];
    /** Column labels (top) */
    colLabels?: string[];
}

// Shading characters from sparse to dense
const SHADE_CHARS_UNICODE = ['░', '▒', '▓', '█'];
const SHADE_CHARS_ASCII   = ['.', ':', '+', '#'];

/**
 * HeatMap — 2D matrix displayed with character-density shading.
 *
 * Values are normalized 0–1 and mapped to 4 shading levels.
 */
export class HeatMap extends Widget {
    private _matrix: number[][];
    private _highColor: Color;
    private _lowColor: Color;
    private _rowLabels: string[];
    private _colLabels: string[];

    constructor(matrix: number[][], style: Partial<Style> = {}, opts: HeatMapOptions = {}) {
        super(style);
        this._matrix = matrix;
        this._highColor = opts.highColor ?? { type: 'named', name: 'red' };
        this._lowColor  = opts.lowColor  ?? { type: 'named', name: 'brightBlack' };
        this._rowLabels = opts.rowLabels ?? [];
        this._colLabels = opts.colLabels ?? [];
    }

    setMatrix(matrix: number[][]): void {
        this._matrix = matrix.map(row => filterFinite(row));
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._matrix.length === 0) return;

        const attrs = styleToCellAttrs(this._style);
        const shadeChars = caps.unicode ? SHADE_CHARS_UNICODE : SHADE_CHARS_ASCII;

        // Compute row label width
        const labelWidth = this._rowLabels.length > 0
            ? Math.max(...this._rowLabels.map(l => l.length)) + 1
            : 0;

        // Compute global min/max for normalization
        let globalMin = Infinity;
        let globalMax = -Infinity;
        for (const row of this._matrix) {
            for (const val of row) {
                if (val < globalMin) globalMin = val;
                if (val > globalMax) globalMax = val;
            }
        }
        const range = globalMax - globalMin || 1;

        // Column labels
        let startRow = 0;
        if (this._colLabels.length > 0) {
            for (let col = 0; col < this._colLabels.length; col++) {
                const cx = x + labelWidth + col;
                if (cx >= x + width) break;
                const label = (this._colLabels[col] ?? '').charAt(0);
                screen.setCell(cx, y, { char: label, ...attrs, dim: true });
            }
            startRow = 1;
        }

        // Render matrix rows
        for (let r = 0; r < this._matrix.length; r++) {
            const rowY = y + startRow + r;
            if (rowY >= y + height) break;

            // Row label
            if (this._rowLabels[r]) {
                const label = this._rowLabels[r].slice(0, labelWidth - 1).padEnd(labelWidth - 1, ' ');
                screen.writeString(x, rowY, label + ' ', { ...attrs, dim: true });
            }

            const row = this._matrix[r];
            if (!row) continue;

            for (let col = 0; col < row.length; col++) {
                const cx = x + labelWidth + col;
                if (cx >= x + width) break;

                const val = row[col] ?? 0;
                const norm = (val - globalMin) / range; // 0..1
                const level = Math.min(3, Math.floor(norm * 4));
                const char = shadeChars[level] ?? shadeChars[0]!;

                // Blend color: low → high based on norm
                // Use high color for dense cells
                const fg = norm >= 0.75 ? this._highColor : this._lowColor;

                screen.setCell(cx, rowY, { char, fg });
            }
        }
    }
}
