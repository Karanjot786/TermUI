// @termuijs/widgets - Tests for LineChart widget

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});


/**
 * Render a LineChart into a Screen and return the back buffer as rows of
 * character strings, mirroring the pattern used across the widget test suite.
 */
async function renderLineChart(
    data: number[],
    opts: import('./LineChart.js').LineChartOptions = {},
    cols = 40,
    rows = 10,
): Promise<string[]> {
    const { Screen } = await import('@termuijs/core');
    const { LineChart } = await import('./LineChart.js');
    const widget = new LineChart(data, {}, opts);
    const screen = new Screen(cols, rows);
    widget.updateRect({ x: 0, y: 0, width: cols, height: rows });
    widget.render(screen);
    return screen.back.map(row => row.map(cell => cell.char).join(''));
}

/** Count occurrences of a character in a string. */
function countChar(str: string, ch: string): number {
    return [...str].filter(c => c === ch).length;
}

/** Count total occurrences of a character across all rows. */
function countCharInGrid(lines: string[], ch: string): number {
    return lines.reduce((acc, row) => acc + countChar(row, ch), 0);
}


describe('LineChart', () => {


    describe('point rendering (unicode)', () => {
        it('renders a point character (●) for each data sample across the plot width', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // 40 cols wide → 40 sample points → 40 '●' characters
            const lines = await renderLineChart([10, 20, 30, 40, 50], {}, 40, 10);
            const total = countCharInGrid(lines, '●');
            expect(total).toBe(40);
        });

        it('places the max-value point on the top row', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // [0, 100] in 2 cols: col 0 = min (norm=0, bottom), col 1 = max (norm=1, top)
            // toRow(max): norm=1 → Math.round((1-1)*(plotHeight-1)) = 0 → row 0
            const lines = await renderLineChart([0, 100], {}, 2, 5);
            expect(lines[0]!.charAt(1)).toBe('●');  // col 1, max → top row
            expect(lines[4]!.charAt(0)).toBe('●');  // col 0, min → bottom row
        });

        it('places the min-value point on the bottom row using explicit min/max', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // data=[0], explicit min=0 max=100 → norm=0 → bottom row (plotHeight-1 = row 4)
            const lines = await renderLineChart([0], { min: 0, max: 100 }, 10, 5);
            expect(lines[4]).toContain('●');
            expect(lines[0]).not.toContain('●');
        });

        it('all identical values render on the same row', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // range guard (range=1) → all norms=0 → all at bottom row
            const lines = await renderLineChart([42, 42, 42, 42], {}, 4, 5);
            const pointRows = lines
                .map((row, idx) => ({ idx, count: countChar(row, '●') }))
                .filter(r => r.count > 0);
            // All points must be on exactly one row
            expect(pointRows).toHaveLength(1);
            expect(pointRows[0]!.count).toBe(4);
        });

        it('vertical connectors (│) are drawn between non-adjacent points', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // Large jump: [0, 100] in 2 cols, 10 rows
            // Row gap = 9, so 8 connector cells expected
            const lines = await renderLineChart([0, 100], {}, 2, 10);
            const connectors = countCharInGrid(lines, '│');
            expect(connectors).toBeGreaterThan(0);
        });

        it('no connectors when adjacent points are in the same or neighboring rows', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // Flat data → no vertical gap → no │ connector
            const lines = await renderLineChart([50, 50, 50, 50], {}, 4, 5);
            const connectors = countCharInGrid(lines, '│');
            expect(connectors).toBe(0);
        });
    });


    describe('ASCII fallback (caps.unicode = false)', () => {
        it('uses * instead of ● when NO_UNICODE=1', async () => {
            vi.stubEnv('NO_UNICODE', '1');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderLineChart([10, 50, 90], {}, 20, 5);
            const stars = countCharInGrid(lines, '*');
            const dots = countCharInGrid(lines, '●');
            expect(stars).toBeGreaterThan(0);
            expect(dots).toBe(0);
        });

        it('total * count equals plotWidth in ASCII mode', async () => {
            vi.stubEnv('NO_UNICODE', '1');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // 20 cols wide, no axes → plotWidth=20 → 20 '*' characters
            const lines = await renderLineChart([0, 50, 100], {}, 20, 5);
            expect(countCharInGrid(lines, '*')).toBe(20);
        });
    });


    describe('Y axis (showYAxis)', () => {
        it('renders the │ axis separator when showYAxis is true', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderLineChart([10, 50, 90], { showYAxis: true }, 20, 5);
            // Axis separator '│' or corner '┤' must appear
            const axisChars = lines.reduce((acc, row) => {
                return acc + countChar(row, '│') + countChar(row, '┤');
            }, 0);
            expect(axisChars).toBeGreaterThan(0);
        });

        it('renders max label (┤) on the top row of Y axis', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderLineChart([0, 100], { showYAxis: true }, 20, 5);
            // Top row must contain '┤'
            expect(lines[0]).toContain('┤');
        });

        it('renders min label (┤) on the bottom plot row of Y axis', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderLineChart([0, 100], { showYAxis: true }, 20, 5);
            // Bottom row must contain '┤'
            expect(lines[4]).toContain('┤');
        });

        it('Y axis consumes 5 columns, shrinking the plot area', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // With 20 cols and yAxisWidth=5 → plotWidth=15 → 15 '●' total
            const lines = await renderLineChart([50], { showYAxis: true }, 20, 5);
            expect(countCharInGrid(lines, '●')).toBe(15);
        });

        it('no Y axis chars appear when showYAxis is false (default)', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderLineChart([10, 50, 90], {}, 20, 5);
            expect(countCharInGrid(lines, '┤')).toBe(0);
        });
    });


    describe('X axis (showXAxis)', () => {
        it('renders a ─ axis on the last row when showXAxis is true', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderLineChart([10, 50, 90], { showXAxis: true }, 20, 5);
            const lastRow = lines[4]!;
            expect(countChar(lastRow, '─')).toBeGreaterThan(0);
        });

        it('X axis fills the entire plot width with ─', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // 20 cols, no Y axis → plotWidth=20 → 20 '─' on last row
            const lines = await renderLineChart([10, 50], { showXAxis: true }, 20, 5);
            expect(countChar(lines[4]!, '─')).toBe(20);
        });

        it('data rows shrink by 1 when showXAxis is true', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // plotHeight=4 (10 rows - 1 for axis)
            // Point chars appear only in rows 0–3, not on last row
            const lines = await renderLineChart([50], { showXAxis: true }, 20, 5);
            expect(lines[4]).not.toContain('●');
        });

        it('renders └ corner when both showXAxis and showYAxis are true', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderLineChart(
                [10, 50, 90],
                { showXAxis: true, showYAxis: true },
                20,
                5,
            );
            const total = countCharInGrid(lines, '└');
            expect(total).toBe(1);
        });

        it('no ─ appears when showXAxis is false (default)', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderLineChart([10, 50, 90], {}, 20, 5);
            expect(countCharInGrid(lines, '─')).toBe(0);
        });
    });


    describe('empty / single-element data', () => {
        it('renders without throwing when data is empty', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            await expect(renderLineChart([], {}, 20, 5)).resolves.not.toThrow();
        });

        it('produces an all-space screen when data is empty', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderLineChart([], {}, 20, 5);
            const total = lines.reduce((acc, row) => acc + [...row].filter(c => c !== ' ').length, 0);
            expect(total).toBe(0);
        });

        it('renders a single data point without throwing', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            await expect(renderLineChart([42], {}, 20, 5)).resolves.not.toThrow();
        });

        it('renders without error when width or height is zero', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const { Screen } = await import('@termuijs/core');
            const { LineChart } = await import('./LineChart.js');
            const widget = new LineChart([10, 50, 90]);
            const screen = new Screen(1, 1);
            widget.updateRect({ x: 0, y: 0, width: 0, height: 0 });
            expect(() => widget.render(screen)).not.toThrow();
        });
    });


    describe('custom min / max options', () => {
        it('respects explicit max: data at max renders at top row', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // data=[50], max=50 → norm=1 → top row
            const lines = await renderLineChart([50], { max: 50, min: 0 }, 10, 5);
            expect(lines[0]).toContain('●');
        });

        it('respects explicit min: data at min renders at bottom row', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // data=[0], min=0, max=100 → norm=0 → bottom row
            const lines = await renderLineChart([0], { max: 100, min: 0 }, 10, 5);
            expect(lines[4]).toContain('●');
        });
    });


    describe('setData() and pushValue()', () => {
        it('setData() replaces data and marks widget dirty', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const { LineChart } = await import('./LineChart.js');
            const widget = new LineChart([10, 20, 30]);
            (widget as any)._dirty = false;
            widget.setData([40, 50, 60]);
            expect(widget.isDirty).toBe(true);
        });

        it('pushValue() appends a value and marks widget dirty', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const { LineChart } = await import('./LineChart.js');
            const widget = new LineChart([10]);
            (widget as any)._dirty = false;
            widget.pushValue(99);
            expect(widget.isDirty).toBe(true);
            expect((widget as any)._data).toContain(99);
        });

        it('new data from setData() is reflected in the next render', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const { Screen } = await import('@termuijs/core');
            const { LineChart } = await import('./LineChart.js');

            const widget = new LineChart([]);
            const screen = new Screen(10, 5);
            widget.updateRect({ x: 0, y: 0, width: 10, height: 5 });

            // Before: empty → no '●'
            widget.render(screen);
            const before = screen.back.some(row => row.some(c => c.char === '●'));
            expect(before).toBe(false);

            // After: non-empty data → '●' appears
            widget.setData([10, 50, 90]);
            widget.render(screen);
            const after = screen.back.some(row => row.some(c => c.char === '●'));
            expect(after).toBe(true);
        });
    });


    describe('color option', () => {
        it('applies custom color to point cells in the screen buffer', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const { Screen } = await import('@termuijs/core');
            const { LineChart } = await import('./LineChart.js');

            const color = { type: 'named' as const, name: 'magenta' as const };
            const widget = new LineChart([10, 50, 90], {}, { color });
            const screen = new Screen(20, 5);
            widget.updateRect({ x: 0, y: 0, width: 20, height: 5 });
            widget.render(screen);

            const magentaCells = screen.back
                .flat()
                .filter(cell => cell.fg.type === 'named' && (cell.fg as any).name === 'magenta');
            expect(magentaCells.length).toBeGreaterThan(0);
        });
    });
});
