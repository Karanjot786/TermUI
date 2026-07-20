import { type Screen, type Style, type Color, caps, truncate } from "@termuijs/core";
import { Widget } from "../base/Widget.js";
import { filterFinite } from "./utils.js";

export interface HistogramOptions {
    bins?: number;
    barColor?: Color;
    xLabel?: string;
}

export class Histogram extends Widget {
    private _values: number[] = [];
    private _bins: number;
    private _barColor: Color;
    private _xLabel?: string;

    constructor(style: Partial<Style> = {}, opts: HistogramOptions = {}) {
        super(style);

        const bins = opts.bins ?? 10;
        if (!Number.isInteger(bins) || bins <= 0) {
            throw new Error("Histogram bins must be a positive integer");
        }
        this._bins = bins;
        this._barColor = opts.barColor ?? { type: "named", name: "cyan" };
        this._xLabel = opts.xLabel;
    }

    setData(values: number[]): void {
        this._values = filterFinite(values);
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;

        if (width <= 0 || height <= 0 || this._values.length === 0) {
            return;
        }

        const counts = this._computeBins();
        const maxCount = Math.max(...counts);

        if (maxCount === 0) {
            return;
        }

        const labelRows = this._xLabel ? 1 : 0;
        const barAreaHeight = height - labelRows;

        if (barAreaHeight <= 0) {
            return;
        }

        const barWidth = Math.max(1, Math.floor(width / counts.length));

        for (let i = 0; i < counts.length; i++) {
            const count = counts[i];

            if (count === undefined) {
                continue;
            }

            const scaledHeight = Math.round((count / maxCount) * barAreaHeight);

            for (let row = 0; row < scaledHeight; row++) {
                for (let col = 0; col < barWidth; col++) {
                    const cellX = x + i * barWidth + col;

                    if (cellX >= x + width) {
                        continue;
                    }

                    screen.setCell(cellX, y + barAreaHeight - 1 - row, {
                        char: caps.unicode ? "█" : "|",
                        fg: this._barColor,
                    });
                }
            }
        }

        if (this._xLabel) {
            screen.writeString(
                x,
                y + height - 1,
                truncate(this._xLabel, width),
                {},
            );
        }
    }

    private _computeBins(): number[] {
        const counts = Array(this._bins).fill(0);

        if (this._values.length === 0) {
            return counts;
        }

        const min = Math.min(...this._values);
        const max = Math.max(...this._values);

        if (min === max) {
            counts[0] = this._values.length;
            return counts;
        }

        const bucketSize = (max - min) / this._bins;

        for (const value of this._values) {
            let index = Math.floor((value - min) / bucketSize);

            if (index >= this._bins) {
                index = this._bins - 1;
            }

            counts[index]++;
        }

        return counts;
    }
}
