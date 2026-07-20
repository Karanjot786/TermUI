// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for markDirty() in widget setters
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Table, type TableColumn, type TableRow } from './Table.js';
import { Gauge } from './Gauge.js';
import { Sparkline } from './Sparkline.js';

describe('markDirty() on widget setters', () => {
    describe('Table', () => {
        it('setRows() marks widget as dirty', () => {
            const cols: TableColumn[] = [{ header: 'Name', key: 'name' }];
            const rows: TableRow[] = [{ name: 'Alice' }];
            const table = new Table(cols, rows);
            (table as any)._dirty = false; // reset

            table.setRows([{ name: 'Bob' }]);
            expect(table.isDirty).toBe(true);
        });
    });

    describe('Gauge', () => {
        it('setValue() marks widget as dirty', () => {
            const gauge = new Gauge('CPU');
            (gauge as any)._dirty = false;

            gauge.setValue(0.75);
            expect(gauge.isDirty).toBe(true);
        });

        it('setLabel() marks widget as dirty', () => {
            const gauge = new Gauge('CPU');
            (gauge as any)._dirty = false;

            gauge.setLabel('Memory');
            expect(gauge.isDirty).toBe(true);
        });
    });

    describe('Sparkline', () => {
        it('setData() marks widget as dirty', () => {
            const spark = new Sparkline('Load');
            (spark as any)._dirty = false;

            spark.setData([1, 2, 3]);
            expect(spark.isDirty).toBe(true);
        });

        it('pushValue() marks widget as dirty', () => {
            const spark = new Sparkline('Load');
            (spark as any)._dirty = false;

            spark.pushValue(42);
            expect(spark.isDirty).toBe(true);
        });
    });
});
