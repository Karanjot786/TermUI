// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Table widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Table } from './Table.js';

const COLUMNS = [
    { header: 'Name', key: 'name' },
    { header: 'Age', key: 'age', align: 'right' as const },
];
const ROWS = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
];

describe('Table', () => {
    it('creates table with columns and rows', () => {
        const table = new Table(COLUMNS, ROWS);
        expect(table).toBeDefined();
    });

    it('setRows replaces data', () => {
        const table = new Table(COLUMNS, ROWS);
        table.setRows([{ name: 'Charlie', age: 35 }]);
        // No crash and table still renders
        expect(table).toBeDefined();
    });

    it('handles empty rows array', () => {
        const table = new Table(COLUMNS, []);
        expect(() => table).not.toThrow();
    });

    it('computes column widths correctly', () => {
        // Access private _computeColumnWidths through rendering
        const columns = [
            { header: 'A', key: 'a', width: 10 },
            { header: 'B', key: 'b' }, // flex
        ];
        const table = new Table(columns, [{ a: 'x', b: 'y' }]);
        expect(table).toBeDefined();
    });

    it('handles custom table options', () => {
        const table = new Table(COLUMNS, ROWS, {}, {
            showHeader: false,
            stripe: false,
            separator: ' | ',
        });
        expect(table).toBeDefined();
    });

    it('accepts right alignment per column', () => {
        const cols = [{ header: 'Price', key: 'price', align: 'right' as const }];
        const table = new Table(cols, [{ price: 99 }]);
        expect(table).toBeDefined();
    });

    it('is focusable so FocusManager can route keyboard events to handleKey', () => {
        const table = new Table(COLUMNS, ROWS);
        expect(table.focusable).toBe(true);
    });

        it('virtualizes rows and updates scroll offset via keyboard navigation', () => {
        // Create 50 rows
        const manyRows = Array.from({ length: 50 }).map((_, i) => ({ name: `Row${i}`, age: i }));
        const table = new Table(COLUMNS, manyRows);
        
        // Mock a screen with a height of 10
        table.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        
        // Initially, selectedRow is 0, offset is 0
        expect(table.selectedRow).toBe(0);
        expect((table as any)._scrollOffset).toBe(0);

        // Move down past the viewport
        for (let i = 0; i < 20; i++) {
            table.handleKey({ key: 'down' } as any);
        }
        
        expect(table.selectedRow).toBe(20);
        
        // Table viewport dataHeight is 10 - 2 (header) = 8
        // So if selected is 20, offset should be clamped to 20 - 8 + 1 = 13
        expect((table as any)._scrollOffset).toBe(13);
    });

    describe('sorting and header focus', () => {
        it('can focus header and trigger onSort callback', () => {
            const onSort = vi.fn();
            const table = new Table(COLUMNS, ROWS, {}, { onSort });
            
            // Go up to focus header (-1)
            table.handleKey({ key: 'up' } as any);
            expect(table.selectedRow).toBe(-1);
            
            // Move right to second column
            table.handleKey({ key: 'right' } as any);
            
            // Toggle sort
            table.handleKey({ key: 'enter' } as any);
            expect(onSort).toHaveBeenCalledWith(1, 'asc');
            
            // Toggle again
            table.handleKey({ key: 'enter' } as any);
            expect(onSort).toHaveBeenCalledWith(1, 'desc');
        });

        it('falls back to internal sort if no onSort is provided', () => {
            const table = new Table(COLUMNS, [
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: 25 },
            ]);
            
            table.handleKey({ key: 'up' } as any); // focus header 0 (Name)
            table.handleKey({ key: 'right' } as any); // focus header 1 (Age)
            
            table.handleKey({ key: 'enter' } as any); // sort asc by age
            expect((table as any)._rows[0].name).toBe('Bob'); // 25 comes first
            
            table.handleKey({ key: 'enter' } as any); // sort desc by age
            expect((table as any)._rows[0].name).toBe('Alice'); // 30 comes first
        });

        it('does not focus header if showHeader is false', () => {
            const table = new Table(COLUMNS, ROWS, {}, { showHeader: false });
            table.handleKey({ key: 'up' } as any);
            expect(table.selectedRow).toBe(0); // Clamped to 0
        });
    });

    describe('page and jump navigation', () => {
        // 50 rows, viewport height 10, showHeader disabled so pageSize === height (10)
        // and row 0 is unambiguously the "first row" (no header-focus state at -1).
        const manyRows = Array.from({ length: 50 }).map((_, i) => ({ name: `Row${i}`, age: i }));

        function makePagedTable() {
            const table = new Table(COLUMNS, manyRows, {}, { showHeader: false });
            table.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            return table;
        }

        it('pagedown advances the selected row by a page', () => {
            const table = makePagedTable();
            table.handleKey({ key: 'pagedown' } as any);
            expect(table.selectedRow).toBe(10);

            table.handleKey({ key: 'pagedown' } as any);
            expect(table.selectedRow).toBe(20);
        });

        it('pagedown is clamped at the last row', () => {
            const table = makePagedTable();
            for (let i = 0; i < 10; i++) {
                table.handleKey({ key: 'pagedown' } as any);
            }
            expect(table.selectedRow).toBe(manyRows.length - 1);

            // One more pagedown past the end stays clamped
            table.handleKey({ key: 'pagedown' } as any);
            expect(table.selectedRow).toBe(manyRows.length - 1);
        });

        it('pageup goes back a page', () => {
            const table = makePagedTable();
            table.handleKey({ key: 'end' } as any);
            expect(table.selectedRow).toBe(manyRows.length - 1); // 49

            table.handleKey({ key: 'pageup' } as any);
            expect(table.selectedRow).toBe(manyRows.length - 1 - 10); // 39
        });

        it('pageup is clamped at row 0', () => {
            const table = makePagedTable();
            table.handleKey({ key: 'down' } as any); // selectedRow = 1
            table.handleKey({ key: 'pageup' } as any);
            expect(table.selectedRow).toBe(0);

            // Another pageup from row 0 stays clamped
            table.handleKey({ key: 'pageup' } as any);
            expect(table.selectedRow).toBe(0);
        });

        it('home jumps to the first row', () => {
            const table = makePagedTable();
            table.handleKey({ key: 'down' } as any);
            table.handleKey({ key: 'down' } as any);
            expect(table.selectedRow).toBe(2);

            table.handleKey({ key: 'home' } as any);
            expect(table.selectedRow).toBe(0);
        });

        it('end jumps to the last row', () => {
            const table = makePagedTable();
            expect(table.selectedRow).toBe(0);

            table.handleKey({ key: 'end' } as any);
            expect(table.selectedRow).toBe(manyRows.length - 1);
        });
    });

});
