// packages/widgets/src/data/__tests__/Table.state.test.ts
import { describe, it, expect } from 'vitest';
import { useTableState } from '../TableState.js';

const rows = [
    { name: 'Alice', age: 30, city: 'New York' },
    { name: 'Bob', age: 25, city: 'London' },
    { name: 'Carol', age: 35, city: 'Tokyo' },
];

describe('useTableState', () => {
    it('initialises with provided rows and scrollOffset 0', () => {
        const s = useTableState({ rows });
        expect(s.rows).toHaveLength(rows.length);
        expect(s.scrollOffset).toBe(0);
    });

    it('scrollNext increments scrollOffset', () => {
        const s = useTableState({ rows });
        s.scrollNext();
        expect(s.scrollOffset).toBe(1);
    });

    it('scrollPrev does nothing at offset 0', () => {
        const s = useTableState({ rows });
        s.scrollPrev();
        expect(s.scrollOffset).toBe(0);
    });

    it('scrollPrev decrements after scrollNext', () => {
        const s = useTableState({ rows });
        s.scrollNext();
        s.scrollNext();
        s.scrollPrev();
        expect(s.scrollOffset).toBe(1);
    });

    it('setRows updates rows and clamps scrollOffset', () => {
        const s = useTableState({ rows });
        s.scrollNext();
        s.scrollNext(); // scrollOffset = 2
        s.setRows([rows[0]]); // only 1 row now
        expect(s.rows).toHaveLength(1);
        expect(s.scrollOffset).toBe(0); // clamped
    });

    it('two consumers sharing the same state see the same scrollOffset', () => {
        const s = useTableState({ rows });
        s.scrollNext();
        // "Consumer B" reads same state object
        expect(s.scrollOffset).toBe(1);
    });

    it('setRows replaces rows on the state object', () => {
        const s = useTableState({ rows });
        const newRows = [{ name: 'Dave', age: 40, city: 'Paris' }];
        s.setRows(newRows);
        expect(s.rows[0].name).toBe('Dave');
    });
});
