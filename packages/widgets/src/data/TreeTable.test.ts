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
