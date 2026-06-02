import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { render } from '@termuijs/testing';
import { createElement as h } from '@termuijs/jsx';
import { Table } from './Table.js';
import { useVirtualRows, type VirtualRowsState } from './hooks/useVirtualRows.js';

// ── Helpers ──

/**
 * A plain, mutable VirtualRowsState stub. Table consumes this object the same
 * way it consumes the hook's return value, but without needing a fiber/render
 * loop — the setters write straight back to the object.
 */
function makeVirtualRows(
    totalRows: number,
    getCell: (row: number, col: number) => string,
    getRowKey?: (row: number) => string,
): VirtualRowsState {
    const state: VirtualRowsState = {
        totalRows,
        getCell,
        getRowKey,
        selectedIndex: 0,
        scrollOffset: 0,
        setSelectedIndex(v) {
            state.selectedIndex =
                typeof v === 'function' ? v(state.selectedIndex) : v;
        },
        setScrollOffset(v) {
            state.scrollOffset =
                typeof v === 'function' ? v(state.scrollOffset) : v;
        },
    };
    return state;
}

function renderTable(table: Table, width: number, height: number): Screen {
    const screen = new Screen(width, height);
    table.updateRect({ x: 0, y: 0, width, height });
    table.render(screen);
    return screen;
}

function screenText(screen: Screen): string {
    return screen.back.map(row => row.map(c => c.char).join('')).join('\n');
}

const KEY = (key: string) => ({
    key,
    ctrl: false,
    alt: false,
    shift: false,
    raw: Buffer.alloc(0),
    stopPropagation() {},
    preventDefault() {},
});

// ── Table virtualization ──

describe('Table virtualization with useVirtualRows', () => {
    it('getCell is called only for visible rows', () => {
        const getCellSpy = vi.fn((row: number, col: number) => `Cell ${row}-${col}`);
        const virtualRows = makeVirtualRows(100, getCellSpy);
        // height 5 = 2 header rows + 3 visible data rows
        const table = new Table(['ID', 'Name'], [], { height: 5 }, { virtualRows });

        const out = screenText(renderTable(table, 40, 5));
        expect(out).toContain('Cell 0-0');
        expect(out).toContain('Cell 2-0');
        expect(out).not.toContain('Cell 3-0');

        const requestedRows = new Set(getCellSpy.mock.calls.map(c => c[0]));
        expect(requestedRows.has(0)).toBe(true);
        expect(requestedRows.has(1)).toBe(true);
        expect(requestedRows.has(2)).toBe(true);
        expect([...requestedRows].filter(r => r >= 3)).toEqual([]);
    });

    it('handles 100,000 rows without lag', () => {
        const getCellSpy = vi.fn((row: number) => `Item ${row}`);
        const virtualRows = makeVirtualRows(100_000, getCellSpy);
        const table = new Table(['ID', 'Name'], [], { height: 10 }, { virtualRows });

        const start = Date.now();
        const out = screenText(renderTable(table, 40, 10));
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(100);
        expect(out).toContain('Item 0');
        expect(out).not.toContain('Item 10');
        // never fetched the full dataset
        expect(getCellSpy.mock.calls.length).toBeLessThan(100);
    });

    it('navigates with keyboard and clamps scrollOffset', () => {
        let lastSelected = -1;
        const virtualRows = makeVirtualRows(10, (row) => `Item ${row}`);
        const table = new Table(['Name'], [], { height: 5 }, {
            virtualRows,
            onSelect: (idx) => { lastSelected = idx; },
        });
        table.updateRect({ x: 0, y: 0, width: 40, height: 5 }); // dataHeight = 3

        expect(table.selectedIndex).toBe(0);
        expect(table.scrollOffset).toBe(0);

        table.handleKey(KEY('down'));
        expect(table.selectedIndex).toBe(1);
        expect(table.scrollOffset).toBe(0);

        table.handleKey(KEY('down'));
        expect(table.selectedIndex).toBe(2);
        expect(table.scrollOffset).toBe(0);

        // moving to index 3 scrolls the 3-row viewport down by 1
        table.handleKey(KEY('down'));
        expect(table.selectedIndex).toBe(3);
        expect(table.scrollOffset).toBe(1);

        table.handleKey(KEY('end'));
        expect(table.selectedIndex).toBe(9);
        expect(table.scrollOffset).toBe(7);

        table.handleKey(KEY('home'));
        expect(table.selectedIndex).toBe(0);
        expect(table.scrollOffset).toBe(0);

        table.handleKey(KEY('enter'));
        expect(lastSelected).toBe(0);
    });
});

// ── useVirtualRows hook logic (fiber harness) ──

describe('useVirtualRows hook', () => {
    it('clamps selectedIndex into the valid range', () => {
        let captured: VirtualRowsState | null = null;
        function App() {
            captured = useVirtualRows({ totalRows: 5, getCell: (r) => `${r}` });
            return null;
        }

        const t = render(h(App, null), { width: 20, height: 5 });
        // push selection out of bounds, then force a re-render
        captured!.setSelectedIndex(99);
        t.rerender();
        expect(captured!.selectedIndex).toBe(4); // clamped to totalRows - 1
        t.unmount();
    });

    it('keeps selection on the same row key when the dataset reorders', () => {
        const unsorted = ['id-a', 'id-b', 'id-c'];
        const sorted = ['id-c', 'id-b', 'id-a'];
        let captured: VirtualRowsState | null = null;
        let data = unsorted;

        function App() {
            captured = useVirtualRows({
                totalRows: 3,
                getCell: (r) => data[r],
                getRowKey: (r) => data[r],
            });
            return null;
        }

        const t = render(h(App, null), { width: 20, height: 5 });
        // select index 1 (id-b) and re-render so the hook records the key
        captured!.setSelectedIndex(1);
        t.rerender();
        expect(captured!.selectedIndex).toBe(1); // id-b

        // reorder the dataset and re-render; id-b stays selected
        data = sorted;
        t.rerender();
        expect(sorted[captured!.selectedIndex]).toBe('id-b');
        t.unmount();
    });
});
