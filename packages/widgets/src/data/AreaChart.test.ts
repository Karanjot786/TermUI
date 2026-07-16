// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for AreaChart widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { caps, Screen } from '@termuijs/core';
import { AreaChart } from './AreaChart.js';

afterEach(() => {
    vi.restoreAllMocks();
});

function renderAreaChart(
    data: number[],
    opts: import('./AreaChart.js').AreaChartOptions = {},
    cols = 40,
    rows = 10,
): Screen {
    const widget = new AreaChart({}, opts);
    widget.setData(data);
    const screen = new Screen(cols, rows);
    widget.updateRect({ x: 0, y: 0, width: cols, height: rows });
    widget.render(screen);
    return screen;
}

function countCharInGrid(screen: Screen, ch: string): number {
    let total = 0;
    for (const row of screen.back) {
        for (const cell of row) {
            if (cell.char === ch) total++;
        }
    }
    return total;
}

describe('AreaChart', () => {
    it('renders without error for 3-value dataset', () => {
        expect(() => renderAreaChart([10, 50, 90], {}, 20, 8)).not.toThrow();
    });

    it('renders braille chars when unicode is enabled', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const screen = renderAreaChart([10, 50, 90], {}, 20, 8);

        const hasBraille = screen.back.flat().some(
            (cell) => cell.char.codePointAt(0)! >= 0x2800 && cell.char.codePointAt(0)! <= 0x28ff,
        );
        expect(hasBraille).toBe(true);
    });

    it('uses # in ASCII fallback when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const screen = renderAreaChart([10, 50, 90], {}, 20, 8);

        expect(countCharInGrid(screen, '#')).toBeGreaterThan(0);
        expect(screen.back.flat().some((cell) => /[⠁-⣿]/.test(cell.char))).toBe(false);
    });

    it('xLabel appears on the last row', () => {
        const screen = renderAreaChart([10, 50, 90], { xLabel: 'Time' }, 20, 8);
        const lastRow = screen.back[7].map((c) => c.char).join('');
        expect(lastRow).toContain('T');
        expect(lastRow).toContain('i');
        expect(lastRow).toContain('m');
        expect(lastRow).toContain('e');
    });

    it('yLabel appears on the first row', () => {
        const screen = renderAreaChart([10, 50, 90], { yLabel: 'MB' }, 20, 8);
        const firstRow = screen.back[0].map((c) => c.char).join('');
        expect(firstRow).toContain('M');
        expect(firstRow).toContain('B');
    });

    it('setData replaces data and marks the widget dirty', () => {
        const widget = new AreaChart();
        widget.setData([1, 2, 3]);
        widget.clearDirty();

        widget.setData([10, 20, 30]);

        expect(widget.isDirty).toBe(true);
    });

    it('empty dataset renders safely with blank screen', () => {
        const screen = renderAreaChart([], {}, 20, 8);
        const nonSpace = screen.back.flat().filter((cell) => cell.char !== ' ').length;
        expect(nonSpace).toBe(0);
    });

    it('renders without error when rect width is zero', () => {
        const widget = new AreaChart();
        widget.setData([10, 50, 90]);
        const screen = new Screen(20, 8);
        widget.updateRect({ x: 0, y: 0, width: 0, height: 8 });
        expect(() => widget.render(screen)).not.toThrow();
    });

    it('renders without error when rect height is zero', () => {
        const widget = new AreaChart();
        widget.setData([10, 50, 90]);
        const screen = new Screen(20, 8);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 0 });
        expect(() => widget.render(screen)).not.toThrow();
    });

    it('showLine: false still renders fill area', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const withLine = renderAreaChart([10, 50, 90], { showLine: true }, 20, 8);
        const withoutLine = renderAreaChart([10, 50, 90], { showLine: false }, 20, 8);

        // fill area must still be present when the line is suppressed
        expect(countCharInGrid(withoutLine, '#')).toBeGreaterThan(0);
        // line-only adds extra cells on top of fill so withLine >= withoutLine
        expect(countCharInGrid(withLine, '#')).toBeGreaterThanOrEqual(
            countCharInGrid(withoutLine, '#'),
        );
    });
});
