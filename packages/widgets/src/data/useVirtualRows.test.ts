import { describe, it, expect, vi } from 'vitest';
import { render } from '@termuijs/testing';
import { createElement as h } from '@termuijs/jsx';
import { Table } from './Table.js';
import { useVirtualRows } from './hooks/useVirtualRows.js';

describe('useVirtualRows and Table Virtualization', () => {
    it('getCell is called only for visible rows', () => {
        const getCellSpy = vi.fn((row: number, col: number) => {
            return `Cell ${row}-${col}`;
        });

        function TestApp() {
            const virtualRows = useVirtualRows({
                totalRows: 100,
                getCell: getCellSpy,
            });

            return h(Table, {
                columns: ['ID', 'Name'],
                virtualRows,
                style: { height: 5 }, // 5 height = 3 visible data rows + 2 header rows
            });
        }

        const t = render(h(TestApp, null), { height: 5, width: 40 });

        // Check rendering output
        const output = t.renderToString();
        expect(output).toContain('Cell 0-0');
        expect(output).toContain('Cell 2-0');
        expect(output).not.toContain('Cell 3-0');

        // Verify only visible row indexes were requested (row 0, 1, 2)
        const calledRowIndices = getCellSpy.mock.calls.map(call => call[0]);
        const uniqueRows = Array.from(new Set(calledRowIndices));
        
        expect(uniqueRows).toContain(0);
        expect(uniqueRows).toContain(1);
        expect(uniqueRows).toContain(2);
        
        // Rows >= 3 should never be called
        const outOfBoundsCalls = uniqueRows.filter(r => r >= 3);
        expect(outOfBoundsCalls).toEqual([]);

        t.unmount();
    });

    it('handles 100,000 rows without lag', () => {
        const getCellSpy = vi.fn((row: number, col: number) => {
            return `Item ${row}`;
        });

        function TestApp() {
            const virtualRows = useVirtualRows({
                totalRows: 100_000,
                getCell: getCellSpy,
            });

            return h(Table, {
                columns: ['ID', 'Name'],
                virtualRows,
            });
        }

        const start = Date.now();
        const t = render(h(TestApp, null), { height: 10, width: 40 });
        const end = Date.now();

        // Must complete instantaneously (< 100ms)
        expect(end - start).toBeLessThan(100);

        const output = t.renderToString();
        expect(output).toContain('Item 0');
        expect(output).not.toContain('Item 10'); // not in viewport

        t.unmount();
    });

    it('navigates with keyboard and clamps scrollOffset', async () => {
        let lastSelected = -1;

        function TestApp() {
            const virtualRows = useVirtualRows({
                totalRows: 10,
                getCell: (row, col) => `Item ${row}`,
            });

            return h(Table, {
                columns: ['Name'],
                virtualRows,
                onSelect: (idx) => { lastSelected = idx; },
            });
        }

        const t = render(h(TestApp, null), { height: 5, width: 40 }); // 3 visible data lines

        const getTable = () => t.getAllByType(Table)[0];
        const fireKey = async (k: string) => {
            const table = getTable();
            table.isFocused = true;
            table.handleKey({
                key: k,
                ctrl: false,
                alt: false,
                shift: false,
                raw: Buffer.alloc(0),
                stopPropagation() {},
                preventDefault() {},
            });
            await Promise.resolve();
        };

        // Verify initial selection
        expect(getTable().selectedIndex).toBe(0);
        expect(getTable().scrollOffset).toBe(0);

        // Move down
        await fireKey('down');
        expect(getTable().selectedIndex).toBe(1);
        expect(getTable().scrollOffset).toBe(0); // still in viewport [0, 1, 2]

        await fireKey('down');
        expect(getTable().selectedIndex).toBe(2);
        expect(getTable().scrollOffset).toBe(0);

        // Moving to index 3 should scroll viewport down (offset becomes 1)
        await fireKey('down');
        expect(getTable().selectedIndex).toBe(3);
        expect(getTable().scrollOffset).toBe(1); // viewport is now [1, 2, 3]

        // Jump to End
        await fireKey('end');
        expect(getTable().selectedIndex).toBe(9);
        expect(getTable().scrollOffset).toBe(7); // viewport is now [7, 8, 9]

        // Jump to Home
        await fireKey('home');
        expect(getTable().selectedIndex).toBe(0);
        expect(getTable().scrollOffset).toBe(0);

        // Confirm selection
        await fireKey('enter');
        expect(lastSelected).toBe(0);

        t.unmount();
    });

    it('preserves selection key stability when dataset is sorted', async () => {
        // We will toggle sorting state on rerender
        interface TestAppProps {
            sorted: boolean;
        }

        function TestApp({ sorted }: TestAppProps) {
            const rawData = [
                { id: 'id-a', name: 'Alice' },
                { id: 'id-b', name: 'Bob' },
                { id: 'id-c', name: 'Charlie' },
            ];

            const data = sorted
                ? [...rawData].sort((a, b) => b.name.localeCompare(a.name)) // Charlie, Bob, Alice
                : rawData; // Alice, Bob, Charlie

            const virtualRows = useVirtualRows({
                totalRows: data.length,
                getCell: (row, col) => col === 0 ? data[row].id : data[row].name,
                getRowKey: (row) => data[row].id,
            });

            return h(Table, {
                columns: ['ID', 'Name'],
                virtualRows,
            });
        }

        // Render unsorted initially:
        // Index 0: Alice ('id-a')
        // Index 1: Bob ('id-b')
        // Index 2: Charlie ('id-c')
        const t = render(h(TestApp, { sorted: false }), { height: 10, width: 40 });

        const getTable = () => t.getAllByType(Table)[0];
        const fireKey = async (k: string) => {
            const table = getTable();
            table.isFocused = true;
            table.handleKey({
                key: k,
                ctrl: false,
                alt: false,
                shift: false,
                raw: Buffer.alloc(0),
                stopPropagation() {},
                preventDefault() {},
            });
            await Promise.resolve();
        };

        // Select 'Bob' at index 1
        await fireKey('down');
        expect(getTable().selectedIndex).toBe(1);

        // Re-render component with sorted=true
        // New order: Charlie, Bob, Alice
        // Index 0: Charlie ('id-c')
        // Index 1: Bob ('id-b')
        // Index 2: Alice ('id-a')
        t.rerender(h(TestApp, { sorted: true }));
        await Promise.resolve();

        // Selection should remain on 'Bob' at index 1
        expect(getTable().selectedIndex).toBe(1);

        // Let's select 'Charlie' (now at index 0)
        await fireKey('up');
        expect(getTable().selectedIndex).toBe(0);

        // Re-render again with sorted=false
        // Alice ('id-a'), Bob ('id-b'), Charlie ('id-c')
        // Charlie should be at index 2
        t.rerender(h(TestApp, { sorted: false }));
        await Promise.resolve();

        // Selection should follow Charlie to index 2
        expect(getTable().selectedIndex).toBe(2);

        t.unmount();
    });
});
