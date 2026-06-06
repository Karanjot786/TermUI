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

    it('empty dataset renders safely', () => {
        const screen = renderAreaChart([], {}, 20, 8);
        const total = screen.back.reduce((acc, row) => acc + row.filter((cell) => cell.char !== ' ').length, 0);
        expect(total).toBe(0);
    });

    it('setData triggers markDirty', () => {
        const widget = new AreaChart();
        widget.clearDirty();

        widget.setData([10, 20, 30]);

        expect(widget.isDirty).toBe(true);
    });

    it('uses # in ASCII fallback when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const screen = renderAreaChart([10, 50, 90], {}, 20, 8);

        expect(countCharInGrid(screen, '#')).toBeGreaterThan(0);
        expect(screen.back.flat().some((cell) => /[⠁-⣿]/.test(cell.char))).toBe(false);
    });
});
