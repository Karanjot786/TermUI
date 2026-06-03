import { describe, it, expect, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { CandlestickChart } from './CandlestickChart.js';

describe('CandlestickChart', () => {
    it('renders a single bullish candle without error', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = new Screen();
        
        const chart = new CandlestickChart({ width: 10, height: 10 });
        
        chart.setData([{ open: 1, high: 4, low: 0, close: 3 }]);
        chart['_renderSelf'](screen);
    });

    it('renders a single bearish candle without error', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = new Screen();
        const chart = new CandlestickChart({ width: 10, height: 10 });
        
        chart.setData([{ open: 3, high: 4, low: 0, close: 1 }]);
        chart['_renderSelf'](screen);
    });

    it('setData triggers markDirty', () => {
        const chart = new CandlestickChart();
        const spy = vi.spyOn(chart, 'markDirty');
        
        chart.setData([{ open: 1, high: 2, low: 1, close: 2 }]);
        expect(spy).toHaveBeenCalled();
    });

    it('ASCII fallback when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = new Screen();
        const chart = new CandlestickChart({ width: 5, height: 5 });
        
        chart.setData([{ open: 1, high: 4, low: 0, close: 3 }]);
        chart['_renderSelf'](screen);
    });
});