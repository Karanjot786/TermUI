// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for CandlestickChart widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('CandlestickChart', () => {
    it('renders nothing when data is empty', async () => {
        const { Screen } = await import('@termuijs/core');
        const { CandlestickChart } = await import('./CandlestickChart.js');

        const chart = new CandlestickChart({ width: 10, height: 10 });
        chart.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        const screen = new Screen(10, 10);
        chart.render(screen);

        // All cells should remain empty (spaces)
        const row0 = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0.trim()).toBe('');
    });

    it('renders a single bullish candle with body and wick characters', async () => {
        const { Screen, caps } = await import('@termuijs/core');
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const { CandlestickChart } = await import('./CandlestickChart.js');

        const chart = new CandlestickChart({ width: 10, height: 10 });
        chart.setData([{ open: 1, high: 4, low: 0, close: 3 }]);
        chart.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        const screen = new Screen(10, 10);
        chart.render(screen);

        // Collect all non-space characters in column 0
        const col0Chars: string[] = [];
        for (let row = 0; row < 10; row++) {
            const ch = screen.back[row][0].char;
            if (ch !== ' ') col0Chars.push(ch);
        }

        // Should have rendered some candle characters
        expect(col0Chars.length).toBeGreaterThan(0);
        // Body uses ┃ (unicode) or =, wick uses |
        expect(col0Chars.some(ch => ch === '┃' || ch === '=')).toBe(true);
    });

    it('renders bearish candle (close < open)', async () => {
        const { Screen, caps } = await import('@termuijs/core');
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const { CandlestickChart } = await import('./CandlestickChart.js');

        const chart = new CandlestickChart({ width: 10, height: 10 });
        chart.setData([{ open: 3, high: 4, low: 0, close: 1 }]);
        chart.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        const screen = new Screen(10, 10);
        chart.render(screen);

        // Collect non-space characters in column 0
        const col0Chars: string[] = [];
        for (let row = 0; row < 10; row++) {
            const ch = screen.back[row][0].char;
            if (ch !== ' ') col0Chars.push(ch);
        }

        expect(col0Chars.length).toBeGreaterThan(0);
    });

    it('setData triggers markDirty', async () => {
        const { CandlestickChart } = await import('./CandlestickChart.js');
        const chart = new CandlestickChart();
        const spy = vi.spyOn(chart, 'markDirty');

        chart.setData([{ open: 1, high: 2, low: 1, close: 2 }]);
        expect(spy).toHaveBeenCalled();
    });

    it('uses ASCII fallback when caps.unicode is false', async () => {
        const { Screen, caps } = await import('@termuijs/core');
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const { CandlestickChart } = await import('./CandlestickChart.js');

        const chart = new CandlestickChart({ width: 5, height: 5 });
        chart.setData([{ open: 1, high: 4, low: 0, close: 3 }]);
        chart.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        const screen = new Screen(5, 5);
        chart.render(screen);

        // Collect all non-space characters
        const allChars: string[] = [];
        for (let row = 0; row < 5; row++) {
            const ch = screen.back[row][0].char;
            if (ch !== ' ') allChars.push(ch);
        }

        // ASCII mode: body should use '=' not '┃'
        expect(allChars).not.toContain('┃');
        // Should contain '=' for body and/or '|' for wick
        expect(allChars.some(ch => ch === '=' || ch === '|')).toBe(true);
    });

    it('renders multiple candles limited by width', async () => {
        const { Screen, caps } = await import('@termuijs/core');
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const { CandlestickChart } = await import('./CandlestickChart.js');

        const chart = new CandlestickChart({ width: 3, height: 10 });
        chart.setData([
            { open: 1, high: 4, low: 0, close: 3 },
            { open: 2, high: 5, low: 1, close: 4 },
            { open: 3, high: 6, low: 2, close: 5 },
            { open: 4, high: 7, low: 3, close: 6 }, // should be clipped (width=3)
        ]);
        chart.updateRect({ x: 0, y: 0, width: 3, height: 10 });
        const screen = new Screen(3, 10);
        chart.render(screen);

        // Column 3 does not exist (width=3 means cols 0,1,2), so the 4th candle
        // should not render. Check that cols 0-2 have content.
        for (let col = 0; col < 3; col++) {
            const colChars: string[] = [];
            for (let row = 0; row < 10; row++) {
                const ch = screen.back[row][col].char;
                if (ch !== ' ') colChars.push(ch);
            }
            expect(colChars.length).toBeGreaterThan(0);
        }
    });

    it('applies correct fg color for bullish vs bearish candles', async () => {
        const { Screen, caps } = await import('@termuijs/core');
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const { CandlestickChart } = await import('./CandlestickChart.js');

        const chart = new CandlestickChart({ width: 2, height: 10 });
        chart.setData([
            { open: 1, high: 4, low: 0, close: 3 }, // bullish (close > open)
            { open: 3, high: 4, low: 0, close: 1 }, // bearish (close < open)
        ]);
        chart.updateRect({ x: 0, y: 0, width: 2, height: 10 });
        const screen = new Screen(2, 10);
        chart.render(screen);

        // Find a non-space cell in col 0 (bullish) — should have green fg
        let bullishColor = null;
        for (let row = 0; row < 10; row++) {
            const cell = screen.back[row][0];
            if (cell.char !== ' ') {
                bullishColor = cell.fg;
                break;
            }
        }
        expect(bullishColor).toEqual({ type: 'named', name: 'green' });

        // Find a non-space cell in col 1 (bearish) — should have red fg
        let bearishColor = null;
        for (let row = 0; row < 10; row++) {
            const cell = screen.back[row][1];
            if (cell.char !== ' ') {
                bearishColor = cell.fg;
                break;
            }
        }
        expect(bearishColor).toEqual({ type: 'named', name: 'red' });
    });
});