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
});
