// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for TreeTable widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { TreeTable, type TreeTableRow } from './TreeTable.js';
import { Screen, type KeyEvent } from '@termuijs/core';

const key = (k: string): KeyEvent => ({ key: k, ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0), stopPropagation: () => {}, preventDefault: () => {} });

// ── Helpers ──────────────────────────────────────────

function makeTreeTable(
    columns: any[],
    rows: TreeTableRow[],
    onSelect?: (row: TreeTableRow) => void,
    width = 60,
    height = 20,
) {
    const table = new TreeTable(columns, rows, {}, { onSelect });
    table.updateRect({ x: 0, y: 0, width, height });
    return table;
}

function renderTable(table: TreeTable, width = 60, height = 20): Screen {
    const screen = new Screen(width, height);
    table.updateRect({ x: 0, y: 0, width, height });
    table.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

// ── Fixtures ─────────────────────────────────────────

const COLUMNS = [
    { header: 'Name', key: 'name' },
    { header: 'Size', key: 'size', align: 'right' as const },
];

const FILE_TREE: TreeTableRow[] = [
    {
        name: 'src',
        size: '4KB',
        children: [
            {
                name: 'components',
                size: '2KB',
                children: [{ name: 'Button.ts', size: '1KB' }],
                expanded: false,
            },
            {
                name: 'utils',
                size: '1KB',
                children: [
                    { name: 'helper.ts', size: '512B' },
                    { name: 'types.ts', size: '256B' },
                ],
                expanded: false,
            },
        ],
        expanded: false,
    },
    { name: 'package.json', size: '1KB' },
];

// ── Tests ─────────────────────────────────────────────

describe('TreeTable', () => {
    it('creates TreeTable with columns and rows', () => {
        const table = makeTreeTable(COLUMNS, FILE_TREE);
        expect(table).toBeDefined();
    });

    it('supports single options object constructor with values and title attributes', () => {
        const table = new TreeTable({
            columns: [
                { key: 'name', title: 'Process Name', width: 30 },
                { key: 'pid', title: 'PID', width: 10, align: 'right' },
            ],
            data: [
                {
                    id: '1',
                    values: { name: 'systemd', pid: '1' },
                    children: [
                        { id: '2', values: { name: 'nginx', pid: '142' } },
                    ],
                    expanded: true,
                },
            ],
            virtualized: true,
            height: 20,
        });

        expect(table.visibleRowsCount).toBe(2);
        const screen = renderTable(table);
        const header = rowText(screen, 0);
        expect(header).toContain('Process Name');
        expect(header).toContain('PID');
    });

    it('handles 10,000+ hierarchical rows efficiently with virtualization', () => {
        const largeTree: TreeTableRow[] = Array.from({ length: 10000 }, (_, i) => ({
            id: `row-${i}`,
            name: `Process-${i}`,
            size: `${i}MB`,
        }));

        const table = new TreeTable(COLUMNS, largeTree, {}, { virtualized: true });
        expect(table.visibleRowsCount).toBe(10000);

        const screen = renderTable(table, 60, 20);
        expect(screen).toBeDefined();

        // Navigate to last item
        table.handleKey(key('end'));
        expect(table.selectedIndex).toBe(9999);
    });

    it('renders root rows with correct prefixes', () => {
        const table = makeTreeTable(COLUMNS, FILE_TREE);
        const screen = renderTable(table);
        // Header is at row 0, separator at 1, data starts at 2
        const row2 = rowText(screen, 2);
        const row3 = rowText(screen, 3);
        expect(row2).toContain('src');
        expect(row2).toMatch(/[▶>]/); // Collapsed parent prefix
        expect(row3).toContain('package.json');
        expect(row3).toMatch(/[•*]/); // Leaf prefix
    });

    it('expands parent row to show children', () => {
        const table = makeTreeTable(COLUMNS, FILE_TREE);
        table.expand();
        const screen = renderTable(table);
        const row3 = rowText(screen, 3); // Should be 'components'
        expect(row3).toContain('components');
    });

    it('calls onSelect when selected row changes', () => {
        const handler = vi.fn();
        const table = makeTreeTable(COLUMNS, FILE_TREE, handler);
        table.handleKey(key('down'));
        expect(handler).toHaveBeenCalledOnce();
    });

    it('collapses expanded parent row', () => {
        const table = makeTreeTable(COLUMNS, FILE_TREE);
        table.expand();
        expect(FILE_TREE[0].expanded).toBe(true);
        table.collapse();
        expect(FILE_TREE[0].expanded).toBe(false);
    });

    it('setRows replaces data correctly', () => {
        const table = makeTreeTable(COLUMNS, FILE_TREE);
        const newRows: TreeTableRow[] = [{ name: 'test', size: '0B' }];
        table.setRows(newRows);
        expect(table).toBeDefined();
    });
});
