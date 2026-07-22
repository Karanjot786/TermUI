import { type Color, type Screen, type Style, caps, truncate } from "@termuijs/core";
import { Widget } from "../base/Widget.js";
import { BrailleCanvas } from "./BrailleCanvas.js";
import { filterFinite } from "./utils.js";

export interface StackedSeries {
    label: string;
    data: number[];
    color?: Color;
}

export interface StackedBarChartOptions {
    categories?: string[];
    barWidth?: number;
}

export class StackedBarChart extends Widget {
    private _series: StackedSeries[] = [];
    private _categories: string[];
    private _barWidth: number;

    constructor(style: Partial<Style> = {}, opts: StackedBarChartOptions = {}) {
        super(style);
        this._categories = opts.categories ?? [];
        this._barWidth = opts.barWidth ?? 2;
    }

    setSeries(series: StackedSeries[]): void {
        this._series = series.map(s => ({ ...s, data: filterFinite(s.data) }));
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0 || this._series.length === 0) {
            return;
        }

        if (!caps.unicode) {
            this._renderAscii(screen, x, y, width, height);
            return;
        }

        this._renderBraille(screen, x, y, width, height);
    }

    private _categoryCount(): number {
        return Math.max(
            this._categories.length,
            ...this._series.map((series) => series.data.length),
        );
    }

    private _totals(categoryCount: number): number[] {
        return Array.from({ length: categoryCount }, (_, index) =>
            this._series.reduce(
                (sum, series) => sum + Math.max(0, series.data[index] ?? 0),
                0,
            ),
        );
    }

    private _renderBraille(
        screen: Screen,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        const categoryCount = this._categoryCount();
        if (categoryCount === 0) return;

        const labelRows = this._categories.length > 0 ? 1 : 0;
        const chartHeight = height - labelRows;
        if (chartHeight <= 0) return;

        const totals = this._totals(categoryCount);
        const maxTotal = Math.max(...totals);
        if (maxTotal <= 0) return;

        const pixelWidth = width * 2;
        const pixelHeight = chartHeight * 4;
        const gap = 1;
        const barWidth = Math.max(1, this._barWidth);
        const step = barWidth + gap;

        this._series.forEach((series, seriesIndex) => {
            const canvas = new BrailleCanvas(
                {
                    width: pixelWidth,
                    height: pixelHeight,
                    color: series.color,
                },
                {},
            );

            for (
                let categoryIndex = 0;
                categoryIndex < categoryCount;
                categoryIndex++
            ) {
                const stackBase = this._series
                    .slice(0, seriesIndex)
                    .reduce(
                        (sum, item) =>
                            sum + Math.max(0, item.data[categoryIndex] ?? 0),
                        0,
                    );

                const value = Math.max(0, series.data[categoryIndex] ?? 0);
                const start = Math.round((stackBase / maxTotal) * pixelHeight);
                const end = Math.round(
                    ((stackBase + value) / maxTotal) * pixelHeight,
                );
                const startX = categoryIndex * step;

                for (
                    let px = startX;
                    px < startX + barWidth && px < pixelWidth;
                    px++
                ) {
                    for (let py = start; py < end; py++) {
                        canvas.drawPixel(px, pixelHeight - 1 - py);
                    }
                }
            }

            canvas.updateRect({ x, y, width, height: chartHeight });
            canvas.render(screen);
        });

        this._renderLabels(screen, x, y + chartHeight, width);
    }

    private _renderAscii(
        screen: Screen,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        const categoryCount = this._categoryCount();
        if (categoryCount === 0) return;

        const labelRows = this._categories.length > 0 ? 1 : 0;
        const chartHeight = height - labelRows;
        if (chartHeight <= 0) return;

        const totals = this._totals(categoryCount);
        const maxTotal = Math.max(...totals);
        if (maxTotal <= 0) return;

        const gap = 1;
        const barWidth = Math.max(1, this._barWidth);
        const step = barWidth + gap;

        for (
            let categoryIndex = 0;
            categoryIndex < categoryCount;
            categoryIndex++
        ) {
            let stackBase = 0;

            for (const series of this._series) {
                const value = Math.max(0, series.data[categoryIndex] ?? 0);
                const start = Math.round((stackBase / maxTotal) * chartHeight);
                const end = Math.round(
                    ((stackBase + value) / maxTotal) * chartHeight,
                );
                const startX = x + categoryIndex * step;

                for (let col = 0; col < barWidth; col++) {
                    const cellX = startX + col;
                    if (cellX >= x + width) continue;

                    for (let row = start; row < end; row++) {
                        const cellY = y + chartHeight - 1 - row;
                        screen.setCell(cellX, cellY, {
                            char: "|",
                            fg: series.color,
                        });
                    }
                }

                stackBase += value;
            }
        }

        this._renderLabels(screen, x, y + chartHeight, width);
    }

    private _renderLabels(
        screen: Screen,
        x: number,
        y: number,
        width: number,
    ): void {
        if (this._categories.length === 0) return;

        const gap = 1;
        const barWidth = Math.max(1, this._barWidth);
        const step = barWidth + gap;

        this._categories.forEach((category, index) => {
            const labelX = x + index * step;
            if (labelX >= x + width) return;

            screen.writeString(labelX, y, truncate(category, barWidth), {});
        });
    }
}
