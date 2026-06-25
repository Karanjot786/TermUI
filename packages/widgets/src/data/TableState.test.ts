// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for useTableState
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { useTableState } from './TableState.js';
import type { TableRow } from './Table.js';

// ── Helpers ───────────────────────────────────────────

const makeRow = (cells: string[]): TableRow => ({
    cells,
} as unknown as TableRow);

const makeRows = (): TableRow[] => [
    makeRow(['Alice', '30', 'Engineer']),
    makeRow(['Bob',   '25', 'Designer']),
    makeRow(['Carol', '35', 'Manager']),
];

// ── Tests ─────────────────────────────────────────────

describe('useTableState', () => {

    // ── initialization ────────────────────────────────

    it('initializes with provided rows', () => {
        const state = useTableState({ rows: makeRows() });
        expect(state.rows).toHaveLength(3);
    });

    it('initializes scrollOffset to 0', () => {
        const state = useTableState({ rows: makeRows() });
        expect(state.scrollOffset).toBe(0);
    });

    // ── setRows ───────────────────────────────────────

    it('setRows() updates the rows', () => {
        const state = useTableState({ rows: makeRows() });
        const newRows: TableRow[] = [makeRow(['Dave', '28', 'Dev'])];
        state.setRows(newRows);
        expect(state.rows).toHaveLength(1);
        expect(state.rows[0].cells).toContain('Dave');
    });

    it('setRows() clamps scrollOffset when new list is shorter', () => {
        const state = useTableState({ rows: makeRows() });
        state.scrollNext();
        state.scrollNext(); // scrollOffset = 2
        state.setRows([makeRow(['Only', '1', 'Row'])]);
        expect(state.scrollOffset).toBe(0);
    });

    it('setRows() keeps scrollOffset when still valid', () => {
        const state = useTableState({ rows: makeRows() });
        state.scrollNext(); // scrollOffset = 1
        state.setRows(makeRows()); // same length
        expect(state.scrollOffset).toBe(1);
    });

    it('setRows() resets scrollOffset to 0 on empty rows', () => {
        const state = useTableState({ rows: makeRows() });
        state.scrollNext();
        state.setRows([]);
        expect(state.scrollOffset).toBe(0);
    });

    // ── scrollNext ────────────────────────────────────

    it('scrollNext() increments scrollOffset', () => {
        const state = useTableState({ rows: makeRows() });
        state.scrollNext();
        expect(state.scrollOffset).toBe(1);
    });

    it('scrollNext() increments multiple times', () => {
        const state = useTableState({ rows: makeRows() });
        state.scrollNext();
        state.scrollNext();
        expect(state.scrollOffset).toBe(2);
    });

    // ── scrollPrev ────────────────────────────────────

    it('scrollPrev() decrements scrollOffset', () => {
        const state = useTableState({ rows: makeRows() });
        state.scrollNext();
        state.scrollNext(); // at 2
        state.scrollPrev();
        expect(state.scrollOffset).toBe(1);
    });

    it('scrollPrev() does not go below 0', () => {
        const state = useTableState({ rows: makeRows() });
        state.scrollPrev(); // already at 0
        expect(state.scrollOffset).toBe(0);
    });
});