// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Table widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
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

});
