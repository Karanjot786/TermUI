// packages/widgets/src/data/TableState.ts
import { TableRow } from './Table.js';

/** External state object for Table widget. */
export interface TableState {
  /** Rows displayed by the table */
  rows: TableRow[];
  /** Scroll offset (first visible row index) */
  scrollOffset: number;
  /** Update rows */
  setRows(rows: TableRow[]): void;
  /** Scroll up */
  scrollPrev(): void;
  /** Scroll down */
  scrollNext(): void;
}

/** Hook that creates a fresh TableState. */
export function useTableState(initial: { rows: TableRow[] }): TableState {
  const state: TableState = {
    rows: initial.rows,
    scrollOffset: 0,
    setRows(rows: TableRow[]) {
      state.rows = rows;
      if (state.scrollOffset >= rows.length) {
        state.scrollOffset = Math.max(0, rows.length - 1);
      }
    },
    scrollPrev() {
      if (state.scrollOffset > 0) {
        state.scrollOffset--;
      }
    },
    scrollNext() {
      state.scrollOffset++;
    },
  };
  return state;
}
