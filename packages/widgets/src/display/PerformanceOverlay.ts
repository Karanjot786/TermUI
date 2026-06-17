import { type Screen, type Style } from '@termuijs/core';
import { styleToCellAttrs } from '@termuijs/core';
import type { FrameStats } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export class PerformanceOverlay extends Widget {
    private _stats: FrameStats = {
        cellsChanged: 0,
        bytesWritten: 0,
        durationMs: 0,
    };

    constructor(style: Partial<Style> = {}) {
        super(style);
    }

    updateStats(stats: FrameStats): void {
        this._stats = stats;
        this.markDirty();
    }

    get stats(): FrameStats {
        return this._stats;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const lines = [
            'Performance',
            `Frame: ${this._stats.durationMs.toFixed(1)}ms`,
            `Cells: ${this._stats.cellsChanged}`,
            `Bytes: ${this._stats.bytesWritten}`,
        ];

        for (let i = 0; i < lines.length && i < height; i++) {
            screen.writeString(x, y + i, lines[i]!, attrs);
        }
    }
}