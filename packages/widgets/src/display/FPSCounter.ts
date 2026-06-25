import { type Screen, type Style, styleToCellAttrs, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface FPSCounterOptions {
    showAverage?: boolean;
    showMinMax?: boolean;
}

export class FPSCounter extends Widget {
    private _fps = 0;
    private _minFps = Infinity;
    private _maxFps = 0;
    private _totalFps = 0;
    private _samples = 0;

    private _showAverage: boolean;
    private _showMinMax: boolean;

    constructor(
        style: Partial<Style> = {},
        opts: FPSCounterOptions = {},
    ) {
        super(style);

        this._showAverage = opts.showAverage ?? true;
        this._showMinMax = opts.showMinMax ?? true;
    }

    updateFPS(fps: number): void {
        if (fps < 0) return;

        this._fps = fps;
        this._minFps = Math.min(this._minFps, fps);
        this._maxFps = Math.max(this._maxFps, fps);

        this._totalFps += fps;
        this._samples++;

        this.markDirty();
    }

    getFPS(): number {
        return this._fps;
    }

    getAverageFPS(): number {
        return this._samples === 0
            ? 0
            : this._totalFps / this._samples;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        let row = 0;

        screen.writeString(
            x,
            y + row++,
            truncate(`FPS: ${this._fps}`, width),
            attrs,
        );

        if (this._showAverage && row < height) {
            screen.writeString(
                x,
                y + row++,
                truncate(`Avg: ${this.getAverageFPS().toFixed(1)}`, width),
                attrs,
            );
        }

        if (this._showMinMax && row < height) {
            screen.writeString(
                x,
                y + row++,
                truncate(`Min: ${this._minFps === Infinity ? 0 : this._minFps}`, width),
                attrs,
            );
        }

        if (this._showMinMax && row < height) {
            screen.writeString(
                x,
                y + row,
                truncate(`Max: ${this._maxFps}`, width),
                attrs,
            );
        }
    }
}