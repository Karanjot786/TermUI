import { Widget } from '../base/Widget.js';
import { type Style, type Color, caps } from '@termuijs/core';

export interface Candle {
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface CandlestickChartOptions {
    upColor?: Color;
    downColor?: Color;
    wickColor?: Color;
}

export class CandlestickChart extends Widget {
    private candles: Candle[] = [];
    private options: CandlestickChartOptions;

    constructor(style?: Partial<Style>, opts?: CandlestickChartOptions) {
        super(style);
        this.options = {
            upColor: opts?.upColor || ('green' as unknown as Color),
            downColor: opts?.downColor || ('red' as unknown as Color),
            wickColor: opts?.wickColor,
            ...opts
        };
    }

    setData(candles: Candle[]): void {
        this.candles = candles;
        this.markDirty();
    }

    protected _renderSelf(screen: any): void {
        if (this.candles.length === 0) return;

        const self = this as any;
        const startX = self.style?.left || self.x || 0;
        const startY = self.style?.top || self.y || 0;
        const width = self.style?.width || self.width || 10;
        const height = self.style?.height || self.height || 10;

        const highs = this.candles.map(c => c.high);
        const lows = this.candles.map(c => c.low);
        const maxHigh = Math.max(...highs);
        const minLow = Math.min(...lows);
        const priceRange = maxHigh - minLow || 1;

        const candleCount = Math.min(this.candles.length, width);

        for (let i = 0; i < candleCount; i++) {
            const candle = this.candles[i];
            const colX = startX + i;

            const mapY = (val: number) => {
                const ratio = (val - minLow) / priceRange;
                return Math.round(startY + height - 1 - ratio * (height - 1));
            };

            const highY = mapY(candle.high);
            const lowY = mapY(candle.low);
            const openY = mapY(candle.open);
            const closeY = mapY(candle.close);

            const bodyTop = Math.min(openY, closeY);
            const bodyBottom = Math.max(openY, closeY);

            const isBullish = candle.close > candle.open;
            const bodyColor = isBullish ? this.options.upColor : this.options.downColor;
            const wickColor = this.options.wickColor || bodyColor;

            const useUnicode = caps.unicode;
            const wickChar = '|';
            const bodyChar = useUnicode ? '┃' : '=';

            for (let rowY = Math.min(highY, lowY); rowY <= Math.max(highY, lowY); rowY++) {
                if (rowY >= bodyTop && rowY <= bodyBottom) {
                    screen.setCell(colX, rowY, bodyChar, bodyColor);
                } else {
                    screen.setCell(colX, rowY, wickChar, wickColor);
                }
            }
        }
    }
}