// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for BarChart widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { BarChart } from './BarChart.js';

// ── Helpers ──────────────────────────────────────────

/**
 * Render a BarChart into a Screen and return the back buffer rows as
 * character strings, mirroring the pattern used across the widget tests.
 */
function renderChart(
    chart: BarChart,
    cols: number,
    rows: number,
): string[] {
    const screen = new Screen(cols, rows);
    chart.updateRect({ x: 0, y: 0, width: cols, height: rows });
    chart.render(screen);
    return screen.back.map(row => row.map(cell => cell.char).join(''));
}

/** Return only the cells that carry a non-space character in a rendered row. */
function nonSpaceCells(row: string): number {
    return [...row].filter(ch => ch !== ' ').length;
}

// ── Suite ────────────────────────────────────────────

describe('BarChart', () => {

    // ── Horizontal ───────────────────────────────────

    describe('horizontal orientation', () => {
        it('renders a full-width bar for value equal to max', () => {
            // value === max → bar fills entire barAreaWidth (8 levels per cell × cols cells)
            const chart = new BarChart(
                [{ bars: [{ value: 100 }] }],
                {},
                { direction: 'horizontal', max: 100 },
            );
            const rows = renderChart(chart, 20, 3);
            // At least one cell in row 0 should be a non-space bar character
            expect(nonSpaceCells(rows[0]!)).toBeGreaterThan(0);
        });

        it('renders a partial bar for a value less than max', () => {
            // 50 % of max → bar should cover roughly half the columns
            const chart50 = new BarChart(
                [{ bars: [{ value: 50 }] }],
                {},
                { direction: 'horizontal', max: 100 },
            );
            const chart100 = new BarChart(
                [{ bars: [{ value: 100 }] }],
                {},
                { direction: 'horizontal', max: 100 },
            );
            const rows50 = renderChart(chart50, 20, 3);
            const rows100 = renderChart(chart100, 20, 3);

            const filled50 = nonSpaceCells(rows50[0]!);
            const filled100 = nonSpaceCells(rows100[0]!);

            // Partial bar must be strictly narrower than full bar
            expect(filled50).toBeGreaterThan(0);
            expect(filled50).toBeLessThan(filled100);
        });

        it('fill width scales with widget width (maxValue normalization)', () => {
            // Same relative value, different widget widths → proportionally more cells filled
            const narrow = new BarChart(
                [{ bars: [{ value: 80 }] }],
                {},
                { direction: 'horizontal', max: 100 },
            );
            const wide = new BarChart(
                [{ bars: [{ value: 80 }] }],
                {},
                { direction: 'horizontal', max: 100 },
            );
            const narrowRows = renderChart(narrow, 20, 3);
            const wideRows = renderChart(wide, 40, 3);

            const narrowFilled = nonSpaceCells(narrowRows[0]!);
            const wideFilled = nonSpaceCells(wideRows[0]!);

            // Wider canvas → more bar cells
            expect(wideFilled).toBeGreaterThan(narrowFilled);
        });

        it('correctly aligns mixed single-byte and multi-byte labels', () => {
            const chart = new BarChart(
                [
                    {
                        bars: [
                            { value: 50, label: 'a' },
                            { value: 50, label: '测试' },
                        ],
                    },
                ],
                {},
                { direction: 'horizontal', max: 100, barWidth: 1, barGap: 0 },
            );
            const rows = renderChart(chart, 30, 4);
            // maxLabelWidth is 4.
            // Row 0 label for 'a': padded to 4 cols -> "   a"
            // Row 1 label for '测试': padded to 4 cols -> "测试"
            expect(rows[0]!.startsWith('   a')).toBe(true);
            expect(rows[1]!.startsWith('测试')).toBe(true);
        });
    });

    // ── Vertical ─────────────────────────────────────

    describe('vertical orientation', () => {
        it('renders a full-height bar for value equal to max', () => {
            const chart = new BarChart(
                [{ bars: [{ value: 100 }] }],
                {},
                { direction: 'vertical', max: 100 },
            );
            // 10 rows: 1 value row at bottom, 8 bar rows (reservedRows=1 since no labels/group labels)
            const rows = renderChart(chart, 10, 10);
            // Column 0 should have at least one non-space bar character
            const barRows = rows.slice(0, -1); // exclude value row
            const filled = barRows.filter(r => r[0] !== ' ').length;
            expect(filled).toBeGreaterThan(0);
        });

        it('renders a partial bar for value below max', () => {
            const chartFull = new BarChart(
                [{ bars: [{ value: 100 }] }],
                {},
                { direction: 'vertical', max: 100 },
            );
            const chartHalf = new BarChart(
                [{ bars: [{ value: 50 }] }],
                {},
                { direction: 'vertical', max: 100 },
            );
            const rowsFull = renderChart(chartFull, 10, 10);
            const rowsHalf = renderChart(chartHalf, 10, 10);

            const filledFull = rowsFull.filter(r => r[0] !== ' ').length;
            const filledHalf = rowsHalf.filter(r => r[0] !== ' ').length;

            expect(filledHalf).toBeLessThan(filledFull);
        });

        it('fill height scales with widget height (maxValue normalization)', () => {
            const short = new BarChart(
                [{ bars: [{ value: 80 }] }],
                {},
                { direction: 'vertical', max: 100 },
            );
            const tall = new BarChart(
                [{ bars: [{ value: 80 }] }],
                {},
                { direction: 'vertical', max: 100 },
            );
            const shortRows = renderChart(short, 5, 10);
            const tallRows = renderChart(tall, 5, 20);

            const shortFilled = shortRows.filter(r => r[0] !== ' ').length;
            const tallFilled = tallRows.filter(r => r[0] !== ' ').length;

            expect(tallFilled).toBeGreaterThan(shortFilled);
        });
    });

    // ── Grouped bars ─────────────────────────────────

    describe('multiple bar groups', () => {
        it('renders multiple groups without throwing', () => {
            const chart = new BarChart(
                [
                    { label: 'Group A', bars: [{ value: 30, label: 'a' }, { value: 60, label: 'b' }] },
                    { label: 'Group B', bars: [{ value: 80, label: 'c' }, { value: 20, label: 'd' }] },
                ],
                {},
                { direction: 'vertical', max: 100 },
            );
            expect(() => renderChart(chart, 40, 15)).not.toThrow();
        });

        it('renders groups in correct order — larger value fills more cells (horizontal)', () => {
            // In horizontal mode, barWidth=1 → each bar occupies one row.
            // groupGap=0 → group 1 on rows[0], group 2 on rows[1].
            const chart = new BarChart(
                [
                    { bars: [{ value: 20 }] },  // smaller → fewer filled cells
                    { bars: [{ value: 80 }] },  // larger  → more filled cells
                ],
                {},
                { direction: 'horizontal', max: 100, barWidth: 1, groupGap: 0 },
            );
            const rows = renderChart(chart, 40, 5);

            const group1Filled = nonSpaceCells(rows[0]!);
            const group2Filled = nonSpaceCells(rows[1]!);

            // Both groups must have rendered something
            expect(group1Filled).toBeGreaterThan(0);
            expect(group2Filled).toBeGreaterThan(0);
            // Second group (value=80) must be wider than first (value=20)
            expect(group2Filled).toBeGreaterThan(group1Filled);
        });

        it('setData() replaces data and marks widget dirty', () => {
            const chart = new BarChart(
                [{ bars: [{ value: 10 }] }],
                {},
                { direction: 'horizontal', max: 100 },
            );
            (chart as any)._dirty = false;
            chart.setData([{ bars: [{ value: 90 }] }]);
            expect(chart.isDirty).toBe(true);
        });

        it('setMax() updates max and marks widget dirty', () => {
            const chart = new BarChart(
                [{ bars: [{ value: 50 }] }],
                {},
                { direction: 'horizontal' },
            );
            (chart as any)._dirty = false;
            chart.setMax(200);
            expect(chart.isDirty).toBe(true);
        });
    });

    // ── Edge cases ───────────────────────────────────

    describe('empty data', () => {
        it('renders without error when data array is empty', () => {
            const chart = new BarChart([], {}, { direction: 'horizontal' });
            expect(() => renderChart(chart, 20, 5)).not.toThrow();
        });

        it('renders a blank screen when data is empty', () => {
            const chart = new BarChart([], {}, { direction: 'horizontal' });
            const rows = renderChart(chart, 20, 5);
            const totalFilled = rows.reduce((acc, r) => acc + nonSpaceCells(r), 0);
            expect(totalFilled).toBe(0);
        });

        it('renders without error when all bar values are 0', () => {
            // max === 0 → guard branch, should not throw
            const chart = new BarChart(
                [{ bars: [{ value: 0 }] }],
                {},
                { direction: 'horizontal' },
            );
            expect(() => renderChart(chart, 20, 5)).not.toThrow();
        });
    });

    // ── Color prop ───────────────────────────────────

    describe('color prop', () => {
        it('applies per-bar color to fill cells in the screen buffer', () => {
            const color = { type: 'named' as const, name: 'red' as const };
            const chart = new BarChart(
                [{ bars: [{ value: 100, color }] }],
                {},
                { direction: 'horizontal', max: 100 },
            );
            const screen = new Screen(20, 3);
            chart.updateRect({ x: 0, y: 0, width: 20, height: 3 });
            chart.render(screen);

            // At least one cell in row 0 should carry the custom color
            const redCells = screen.back[0]!.filter(
                cell => cell.fg.type === 'named' && (cell.fg as any).name === 'red',
            );
            expect(redCells.length).toBeGreaterThan(0);
        });

        it('applies barColor option as default color when no per-bar color is set', () => {
            const barColor = { type: 'named' as const, name: 'green' as const };
            const chart = new BarChart(
                [{ bars: [{ value: 100 }] }],
                {},
                { direction: 'horizontal', max: 100, barColor },
            );
            const screen = new Screen(20, 3);
            chart.updateRect({ x: 0, y: 0, width: 20, height: 3 });
            chart.render(screen);

            const greenCells = screen.back[0]!.filter(
                cell => cell.fg.type === 'named' && (cell.fg as any).name === 'green',
            );
            expect(greenCells.length).toBeGreaterThan(0);
        });

        it('per-bar color overrides the global barColor option', () => {
            const globalColor = { type: 'named' as const, name: 'blue' as const };
            const perBarColor = { type: 'named' as const, name: 'magenta' as const };
            const chart = new BarChart(
                [{ bars: [{ value: 100, color: perBarColor }] }],
                {},
                { direction: 'horizontal', max: 100, barColor: globalColor },
            );
            const screen = new Screen(20, 3);
            chart.updateRect({ x: 0, y: 0, width: 20, height: 3 });
            chart.render(screen);

            const magentaCells = screen.back[0]!.filter(
                cell => cell.fg.type === 'named' && (cell.fg as any).name === 'magenta',
            );
            const blueCells = screen.back[0]!.filter(
                cell => cell.fg.type === 'named' && (cell.fg as any).name === 'blue',
            );
            expect(magentaCells.length).toBeGreaterThan(0);
            expect(blueCells.length).toBe(0);
        });
    });
});
