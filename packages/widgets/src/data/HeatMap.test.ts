// @termuijs/widgets - Tests for HeatMap widget

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});


/**
 * Render a HeatMap into a Screen and return the back buffer as rows of
 * character strings, mirroring the pattern used across the widget tests.
 */
async function renderHeatMap(
    matrix: number[][],
    opts: import('./HeatMap.js').HeatMapOptions = {},
    cols = 40,
    rows = 10,
): Promise<string[]> {
    const { Screen } = await import('@termuijs/core');
    const { HeatMap } = await import('./HeatMap.js');
    const widget = new HeatMap(matrix, {}, opts);
    const screen = new Screen(cols, rows);
    widget.updateRect({ x: 0, y: 0, width: cols, height: rows });
    widget.render(screen);
    return screen.back.map(row => row.map(cell => cell.char).join(''));
}


describe('HeatMap', () => {


    describe('2D matrix dimensions', () => {
        it('renders the correct number of columns per row', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // 2 rows × 3 cols → each data row occupies exactly 3 cells
            const lines = await renderHeatMap([[0, 50, 100], [25, 75, 50]], {}, 20, 5);
            // Row 0 should have exactly 3 non-space shading characters
            const shadeChars = new Set(['░', '▒', '▓', '█']);
            const shadedCols = [...lines[0]!].filter(ch => shadeChars.has(ch));
            expect(shadedCols).toHaveLength(3);
        });

        it('renders the correct number of data rows', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // 3 rows × 2 cols - expect 3 rows each containing shade characters
            const lines = await renderHeatMap(
                [[0, 100], [50, 50], [100, 0]],
                {},
                20,
                10,
            );
            const shadeChars = new Set(['░', '▒', '▓', '█']);
            const dataRows = lines.filter(row =>
                [...row].some(ch => shadeChars.has(ch)),
            );
            expect(dataRows).toHaveLength(3);
        });
    });


    describe('shading characters (unicode)', () => {
        it('high value (100) produces the densest shade char ▓ or █', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // Single-cell matrix with value 100 - globalMin=globalMax=100, range=1 guard,
            // norm = (100-100)/1 = 0 → level 0 → '░'.
            // Use a spread so norm is meaningful: [0, 100]
            const lines = await renderHeatMap([[0, 100]], {}, 20, 5);
            // Column 1 (value=100, norm=1.0) → level = min(3, floor(1*4)) = 3 → '█'
            expect(lines[0]![1]).toBe('█');
        });

        it('low value (0 in a 0–100 range) produces the lightest shade char ░', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderHeatMap([[0, 100]], {}, 20, 5);
            // Column 0 (value=0, norm=0.0) → level 0 → '░'
            expect(lines[0]![0]).toBe('░');
        });

        it('mid-range values produce intermediate shading chars', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // [0, 33, 66, 100] → norms ≈ 0, 0.33, 0.66, 1.0 → levels 0,1,2,3
            const lines = await renderHeatMap([[0, 33, 66, 100]], {}, 20, 5);
            expect(lines[0]![0]).toBe('░'); // level 0
            expect(lines[0]![1]).toBe('▒'); // level 1
            expect(lines[0]![2]).toBe('▓'); // level 2
            expect(lines[0]![3]).toBe('█'); // level 3
        });

        it('all-identical values still render a shading char (range guard)', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // range=0 → guarded to 1 → norm=0 for every cell → '░'
            const lines = await renderHeatMap([[42, 42], [42, 42]], {}, 20, 5);
            const shadeChars = new Set(['░', '▒', '▓', '█']);
            expect(shadeChars.has(lines[0]![0]!)).toBe(true);
            expect(shadeChars.has(lines[0]![1]!)).toBe(true);
        });
    });


    describe('ASCII fallback (caps.unicode = false)', () => {
        it('uses ASCII shade chars when NO_UNICODE=1', async () => {
            vi.stubEnv('NO_UNICODE', '1');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderHeatMap([[0, 33, 66, 100]], {}, 20, 5);
            const asciiShade = new Set(['.', ':', '+', '#']);
            const unicodeShade = new Set(['░', '▒', '▓', '█']);

            const chars = [...lines[0]!.slice(0, 4)];
            chars.forEach(ch => expect(asciiShade.has(ch)).toBe(true));
            chars.forEach(ch => expect(unicodeShade.has(ch)).toBe(false));
        });

        it('maps high value to # and low value to . in ASCII mode', async () => {
            vi.stubEnv('NO_UNICODE', '1');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderHeatMap([[0, 100]], {}, 20, 5);
            expect(lines[0]![0]).toBe('.'); // low → '.'
            expect(lines[0]![1]).toBe('#'); // high → '#'
        });
    });


    describe('row and column labels', () => {
        it('column labels appear on row 0 when provided', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderHeatMap(
                [[0, 50, 100]],
                { colLabels: ['Alpha', 'Beta', 'Gamma'] },
                20,
                5,
            );
            // Column label row uses first char of each label
            // No rowLabels → labelWidth=0, so labels start at x=0
            expect(lines[0]!.charAt(0)).toBe('A');
            expect(lines[0]!.charAt(1)).toBe('B');
            expect(lines[0]!.charAt(2)).toBe('G');
        });

        it('data rows are shifted down by 1 when column labels are present', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const shadeChars = new Set(['░', '▒', '▓', '█']);
            const linesWithLabels = await renderHeatMap(
                [[0, 100]],
                { colLabels: ['X', 'Y'] },
                20,
                5,
            );
            // Row 0 is the label row (no shade chars), row 1 holds data
            const row0HasShade = [...linesWithLabels[0]!].some(ch => shadeChars.has(ch));
            const row1HasShade = [...linesWithLabels[1]!].some(ch => shadeChars.has(ch));
            expect(row0HasShade).toBe(false);
            expect(row1HasShade).toBe(true);
        });

        it('row labels occupy the leftmost columns and push data right', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            // rowLabel "AB" → labelWidth = 2+1 = 3, data starts at col 3
            const lines = await renderHeatMap(
                [[0, 100]],
                { rowLabels: ['AB'] },
                20,
                5,
            );
            // First two chars should be label text 'AB', col 2 = space, col 3 = shade
            expect(lines[0]!.slice(0, 2)).toBe('AB');
        });

        it('row labels render at the correct row positions', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderHeatMap(
                [[0, 100], [50, 50]],
                { rowLabels: ['R1', 'R2'] },
                20,
                5,
            );
            expect(lines[0]!.startsWith('R1')).toBe(true);
            expect(lines[1]!.startsWith('R2')).toBe(true);
        });
    });


    describe('empty matrix', () => {
        it('renders without throwing when matrix is empty', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            await expect(renderHeatMap([], {}, 20, 5)).resolves.not.toThrow();
        });

        it('produces an all-space screen when matrix is empty', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const lines = await renderHeatMap([], {}, 20, 5);
            const totalNonSpace = lines.reduce(
                (acc, row) => acc + [...row].filter(ch => ch !== ' ').length,
                0,
            );
            expect(totalNonSpace).toBe(0);
        });

        it('renders without throwing when matrix rows are empty arrays', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            await expect(renderHeatMap([[], []], {}, 20, 5)).resolves.not.toThrow();
        });
    });


    describe('setMatrix()', () => {
        it('replaces matrix data and marks widget dirty', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const { HeatMap } = await import('./HeatMap.js');
            const widget = new HeatMap([[0, 100]], {});
            (widget as any)._dirty = false;
            widget.setMatrix([[50, 50]]);
            expect(widget.isDirty).toBe(true);
        });

        it('new matrix data is reflected in the next render', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const { Screen } = await import('@termuijs/core');
            const { HeatMap } = await import('./HeatMap.js');
            const shadeChars = new Set(['░', '▒', '▓', '█']);

            const widget = new HeatMap([], {});
            const screen = new Screen(20, 5);
            widget.updateRect({ x: 0, y: 0, width: 20, height: 5 });

            // Before: empty matrix → no shade chars
            widget.render(screen);
            const beforeHasShade = screen.back.some(row =>
                row.some(cell => shadeChars.has(cell.char)),
            );
            expect(beforeHasShade).toBe(false);

            // After: non-empty matrix → shade chars present
            widget.setMatrix([[0, 100]]);
            widget.render(screen);
            const afterHasShade = screen.back.some(row =>
                row.some(cell => shadeChars.has(cell.char)),
            );
            expect(afterHasShade).toBe(true);
        });
    });


    describe('color options', () => {
        it('applies highColor to cells with norm >= 0.75', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const { Screen } = await import('@termuijs/core');
            const { HeatMap } = await import('./HeatMap.js');

            const highColor = { type: 'named' as const, name: 'red' as const };
            // [0, 100] → norm of col 1 = 1.0 (>= 0.75) → highColor
            const widget = new HeatMap([[0, 100]], {}, { highColor });
            const screen = new Screen(20, 5);
            widget.updateRect({ x: 0, y: 0, width: 20, height: 5 });
            widget.render(screen);

            const highCells = screen.back[0]!.filter(
                cell => cell.fg.type === 'named' && (cell.fg as any).name === 'red',
            );
            expect(highCells.length).toBeGreaterThan(0);
        });

        it('applies lowColor to cells with norm < 0.75', async () => {
            vi.stubEnv('NO_UNICODE', '');
            vi.stubEnv('TERM', '');
            vi.resetModules();

            const { Screen } = await import('@termuijs/core');
            const { HeatMap } = await import('./HeatMap.js');

            const lowColor = { type: 'named' as const, name: 'cyan' as const };
            // [0, 100] → norm of col 0 = 0.0 (< 0.75) → lowColor
            const widget = new HeatMap([[0, 100]], {}, { lowColor });
            const screen = new Screen(20, 5);
            widget.updateRect({ x: 0, y: 0, width: 20, height: 5 });
            widget.render(screen);

            const lowCells = screen.back[0]!.filter(
                cell => cell.fg.type === 'named' && (cell.fg as any).name === 'cyan',
            );
            expect(lowCells.length).toBeGreaterThan(0);
        });
    });
});
