// ─────────────────────────────────────────────────────
// @termuijs/widgets — CandlestickChart widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface Candle {
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface CandlestickChartOptions {
    /** Color for bullish (close > open) candles */
    upColor?: Color;
    /** Color for bearish (close < open) candles */
    downColor?: Color;
    /** Color for the wick (high/low lines) */
    wickColor?: Color;
}

const DEFAULT_UP_COLOR: Color = { type: 'named', name: 'green' };
const DEFAULT_DOWN_COLOR: Color = { type: 'named', name: 'red' };

/**
 * CandlestickChart — renders OHLC candle data as a terminal chart.
 *
 * Each candle occupies one column. The body shows open/close range,
 * wicks extend to high/low. Bullish candles use upColor, bearish use downColor.
 */
export class CandlestickChart extends Widget {
    private _candles: Candle[] = [];
    private _upColor: Color;
    private _downColor: Color;
    private _wickColor: Color | undefined;

    constructor(style?: Partial<Style>, opts?: CandlestickChartOptions) {
        super(style);
        this._upColor = opts?.upColor ?? DEFAULT_UP_COLOR;
        this._downColor = opts?.downColor ?? DEFAULT_DOWN_COLOR;
        this._wickColor = opts?.wickColor;
    }

    setData(candles: Candle[]): void {
        this._candles = candles;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        if (this._candles.length === 0) return;

        const rect = this._getContentRect();
        const { x: startX, y: startY, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const candleCount = Math.min(this._candles.length, width);
        const visibleCandles = this._candles.slice(0, candleCount);

        let maxHigh = 0;
        let minLow = 0;
        if (visibleCandles.length > 0) {
            maxHigh = Math.max(...visibleCandles.map(c => c.high));
            minLow = Math.min(...visibleCandles.map(c => c.low));
        }

        const priceRange = maxHigh - minLow || 1;

        for (let i = 0; i < candleCount; i++) {
            const candle = this._candles[i];
            const colX = startX + i;

            const mapY = (val: number): number => {
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
            const bodyColor = isBullish ? this._upColor : this._downColor;
            const wickColor = this._wickColor ?? bodyColor;

            const wickChar = '|';
            const bodyChar = caps.unicode ? '┃' : '=';

            for (let rowY = Math.min(highY, lowY); rowY <= Math.max(highY, lowY); rowY++) {
                if (rowY >= bodyTop && rowY <= bodyBottom) {
                    screen.setCell(colX, rowY, { char: bodyChar, ...attrs, fg: bodyColor });
                } else {
                    screen.setCell(colX, rowY, { char: wickChar, ...attrs, fg: wickColor });
                }
            }
        }
    }
}