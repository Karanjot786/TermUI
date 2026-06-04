// ─────────────────────────────────────────────────────────────────────────────
// @termuijs/widgets — Tests for DataGrid widget
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { DataGrid } from './DataGrid.js';

afterEach(() => {
    vi.restoreAllMocks();
});

const COLUMNS = [
    { key: 'name', header: 'Name', width: 10, sortable: true },
    { key: 'age',  header: 'Age',  width: 5,  sortable: true },
];

const ROWS = [
    { name: 'Alice', age: 30 },
    { name: 'Bob',   age: 25 },
    { name: 'Carol', age: 35 },
];

describe('DataGrid', () => {
    it('renders header row', async () => {
        const { Screen } = await import('@termuijs/core');
        const { DataGrid } = await import('./DataGrid.js');

        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS });
        grid.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);
        grid.render(screen);

        const row1 = screen.back[1].map((c: { char: string }) => c.char).join('');
        expect(row1).toContain('Name');
        expect(row1).toContain('Age');
    });

    it('renders data rows', async () => {
        const { Screen } = await import('@termuijs/core');
        const { DataGrid } = await import('./DataGrid.js');

        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS });
        grid.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);
        grid.render(screen);

        const allText = screen.back.map((r: { char: string }[]) => r.map(c => c.char).join('')).join('\n');
        expect(allText).toContain('Alice');
        expect(allText).toContain('Bob');
    });

    it('selectNext and selectPrev move selected row', async () => {
        const { DataGrid } = await import('./DataGrid.js');

        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS });
        expect(grid.selectedRow).toBe(0);
        grid.selectNext();
        expect(grid.selectedRow).toBe(1);
        grid.selectPrev();
        expect(grid.selectedRow).toBe(0);
    });

    it('selectNext does not go past last row', async () => {
        const { DataGrid } = await import('./DataGrid.js');

        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS });
        grid.selectNext(); grid.selectNext(); grid.selectNext();
        expect(grid.selectedRow).toBe(2);
    });

    it('selectLeft and selectRight move selected column', async () => {
        const { DataGrid } = await import('./DataGrid.js');

        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS });
        expect(grid.selectedCol).toBe(0);
        grid.selectRight();
        expect(grid.selectedCol).toBe(1);
        grid.selectLeft();
        expect(grid.selectedCol).toBe(0);
    });

    it('toggleSort cycles asc → desc → none', async () => {
        const { DataGrid } = await import('./DataGrid.js');

        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS });
        grid.toggleSort();
        expect(grid.sortKey).toBe('name');
        expect(grid.sortDirection).toBe('asc');
        grid.toggleSort();
        expect(grid.sortDirection).toBe('desc');
        grid.toggleSort();
        expect(grid.sortDirection).toBe('none');
        expect(grid.sortKey).toBeNull();
    });

    it('onSort callback fires with correct args', async () => {
        const { DataGrid } = await import('./DataGrid.js');

        const onSort = vi.fn();
        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS, onSort });
        grid.toggleSort();
        expect(onSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('shows (no data) when rows are empty', async () => {
        const { Screen } = await import('@termuijs/core');
        const { DataGrid } = await import('./DataGrid.js');

        const grid = new DataGrid({ columns: COLUMNS, rows: [] });
        grid.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);
        grid.render(screen);

        const allText = screen.back.map((r: { char: string }[]) => r.map(c => c.char).join('')).join('\n');
        expect(allText).toContain('no data');
    });

    it('uses ASCII separator when unicode is off', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS });
        grid.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);
        grid.render(screen);
        const allText = screen.back.map((r: { char: string }[]) => r.map(c => c.char).join('')).join('\n');
        expect(allText).toContain('|');
    });

    it('setRows updates data and clamps selection', async () => {
        const { DataGrid } = await import('./DataGrid.js');

        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS });
        grid.selectNext(); grid.selectNext();
        expect(grid.selectedRow).toBe(2);
        grid.setRows([{ name: 'Zara', age: 20 }]);
        expect(grid.selectedRow).toBe(0);
    });

    it('handleKey routes arrow keys correctly', async () => {
        const { DataGrid } = await import('./DataGrid.js');

        const grid = new DataGrid({ columns: COLUMNS, rows: ROWS });
        grid.handleKey({ key: 'down' } as never);
        expect(grid.selectedRow).toBe(1);
        grid.handleKey({ key: 'up' } as never);
        expect(grid.selectedRow).toBe(0);
        grid.handleKey({ key: 'right' } as never);
        expect(grid.selectedCol).toBe(1);
        grid.handleKey({ key: 'left' } as never);
        expect(grid.selectedCol).toBe(0);
    });
});
