// ─────────────────────────────────────────────────────────────────────────────
// @termuijs/widgets — Tests for DataGrid widget
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps, createKeyEvent } from '@termuijs/core';
import { DataGrid, type DataGridColumn } from './DataGrid.js';

afterEach(() => {
    vi.restoreAllMocks();
});

const COLUMNS: DataGridColumn[] = [
    { key: 'name', header: 'Name', width: 10 },
    { key: 'age', header: 'Age', width: 5 },
];

const ROWS = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
    { name: 'Carol', age: 35 },
];

const gridText = (screen: Screen): string =>
    screen.back.map(r => r.map(c => c.char).join('')).join('\n');

const keyOf = (key: string): ReturnType<typeof createKeyEvent> =>
    createKeyEvent({ key, raw: Buffer.from(key), ctrl: false, alt: false, shift: false });

describe('DataGrid', () => {
    it('renders the same as Table by default — header and data rows', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        grid.updateRect({ x: 0, y: 0, width: 30, height: 8 });
        const screen = new Screen(30, 8);
        grid.render(screen);

        const text = gridText(screen);
        expect(text).toContain('Name');
        expect(text).toContain('Age');
        expect(text).toContain('Alice');
        expect(text).toContain('Bob');
        expect(text).toContain('Carol');
    });

    it('s key cycles sort: none → asc → desc → none', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        expect(grid.sortDirection).toBe('none');
        expect(grid.sortKey).toBeNull();

        grid.handleKey(keyOf('s'));
        expect(grid.sortDirection).toBe('asc');
        expect(grid.sortKey).toBe('name');

        grid.handleKey(keyOf('s'));
        expect(grid.sortDirection).toBe('desc');

        grid.handleKey(keyOf('s'));
        expect(grid.sortDirection).toBe('none');
        expect(grid.sortKey).toBeNull();
    });

    it('sort changes the visible row order', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        grid.updateRect({ x: 0, y: 0, width: 30, height: 8 });
        const before = (() => {
            const s = new Screen(30, 8);
            grid.render(s);
            return gridText(s);
        })();
        expect(before.indexOf('Alice')).toBeLessThan(before.indexOf('Bob'));

        grid.handleKey(keyOf('s')); // asc by name: Alice, Bob, Carol (already)
        grid.handleKey(keyOf('s')); // desc by name: Carol, Bob, Alice
        const s2 = new Screen(30, 8);
        grid.render(s2);
        const after = gridText(s2);
        expect(after.indexOf('Carol')).toBeLessThan(after.indexOf('Bob'));
        expect(after.indexOf('Bob')).toBeLessThan(after.indexOf('Alice'));
    });

    it('renders a sort indicator in the header when a column is sorted', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        grid.updateRect({ x: 0, y: 0, width: 30, height: 8 });
        grid.handleKey(keyOf('s'));

        const screen = new Screen(30, 8);
        grid.render(screen);
        const text = gridText(screen);
        expect(text).toContain('\u25B2'); // ▲ for asc
    });

    it('uses ASCII sort indicator when unicode is off', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const grid = new DataGrid(COLUMNS, ROWS);
        grid.updateRect({ x: 0, y: 0, width: 30, height: 8 });
        grid.handleKey(keyOf('s'));

        const screen = new Screen(30, 8);
        grid.render(screen);
        const text = gridText(screen);
        expect(text).toContain('^');
        expect(text).not.toContain('\u25B2');
    });

    it('typing after / opens filter and narrows visible rows', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        grid.updateRect({ x: 0, y: 0, width: 30, height: 8 });
        grid.handleKey(keyOf('/'));
        expect(grid.filterOpen).toBe(true);

        grid.handleKey(keyOf('b'));
        expect(grid.filter).toBe('b');

        const screen = new Screen(30, 8);
        grid.render(screen);
        const text = gridText(screen);
        expect(text).toContain('Bob');
        expect(text).not.toContain('Alice');
        expect(text).not.toContain('Carol');
    });

    it('Escape closes the filter and clears the narrowed rows', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        grid.updateRect({ x: 0, y: 0, width: 30, height: 8 });
        grid.handleKey(keyOf('/'));
        grid.handleKey(keyOf('c'));
        grid.handleKey(keyOf('a'));
        expect(grid.filter).toBe('ca');

        grid.handleKey(keyOf('escape'));
        expect(grid.filterOpen).toBe(false);
        expect(grid.filter).toBe('');

        const screen = new Screen(30, 8);
        grid.render(screen);
        const text = gridText(screen);
        expect(text).toContain('Alice');
        expect(text).toContain('Bob');
        expect(text).toContain('Carol');
    });

    it('calls onSort callback with key and direction', () => {
        const onSort = vi.fn();
        const grid = new DataGrid(COLUMNS, ROWS, {}, { onSort });
        grid.handleKey(keyOf('s'));
        expect(onSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('renders the filter row with the current filter text', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        grid.updateRect({ x: 0, y: 0, width: 30, height: 8 });
        grid.handleKey(keyOf('/'));
        grid.handleKey(keyOf('b'));

        const screen = new Screen(30, 8);
        grid.render(screen);
        const text = gridText(screen);
        const firstLine = text.split('\n')[0] ?? '';
        expect(firstLine).toContain('/b');
    });

    it('left and right keys move the selected column', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        expect(grid.selectedColumn).toBe(0);

        grid.handleKey(keyOf('right'));
        expect(grid.selectedColumn).toBe(1);

        grid.handleKey(keyOf('right'));
        expect(grid.selectedColumn).toBe(1); // clamped at last column

        grid.handleKey(keyOf('left'));
        expect(grid.selectedColumn).toBe(0);

        grid.handleKey(keyOf('left'));
        expect(grid.selectedColumn).toBe(0); // clamped at first column
    });

    it('sorts the column under the selection, not always column 0', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        grid.handleKey(keyOf('right')); // select 'age' column
        grid.handleKey(keyOf('s'));

        expect(grid.sortKey).toBe('age');
        expect(grid.sortDirection).toBe('asc');
    });

    it('shift+s also cycles sort (case-insensitive key handling)', () => {
        const grid = new DataGrid(COLUMNS, ROWS);
        grid.handleKey(keyOf('S'));
        expect(grid.sortDirection).toBe('asc');
        expect(grid.sortKey).toBe('name');
    });
    
    it('up and down keys move the selected row', () => {
        const grid = new DataGrid(COLUMNS, ROWS);

        expect(grid.selectedRow).toBe(0);

        grid.handleKey(keyOf('down'));
        expect(grid.selectedRow).toBe(1);

        grid.handleKey(keyOf('down'));
        expect(grid.selectedRow).toBe(2);

        grid.handleKey(keyOf('up'));
        expect(grid.selectedRow).toBe(1);
    });

});
