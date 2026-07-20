// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for List widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { List, type ListItem } from './List.js';

describe('List', () => {
    const items: ListItem[] = [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Cherry', value: 'cherry' },
    ];

    it('setItems() with empty array does not crash', () => {
        const list = new List(items);
        expect(() => list.setItems([])).not.toThrow();
    });

    it('selectPrev() at first item is a no-op', () => {
        const list = new List(items);
        list.selectPrev();
        expect(list.selectedIndex).toBe(0);
    });

    it('selectNext() at last item is a no-op', () => {
        const list = new List(items);
        list.selectNext(); // 0 → 1
        list.selectNext(); // 1 → 2
        list.selectNext(); // 2 → stays 2
        expect(list.selectedIndex).toBe(2);
    });

    it('disabled items are skipped during navigation', () => {
        const disabledItems: ListItem[] = [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b', disabled: true },
            { label: 'C', value: 'c' },
        ];
        const list = new List(disabledItems);

        list.selectNext(); // 0 → skip 1 → 2
        expect(list.selectedIndex).toBe(2);

        list.selectPrev(); // 2 → skip 1 → 0
        expect(list.selectedIndex).toBe(0);
    });

    it('confirm() does not fire callback for disabled items', () => {
        const handler = vi.fn();
        const disabledItems: ListItem[] = [
            { label: 'A', value: 'a', disabled: true },
        ];
        const list = new List(disabledItems, {}, handler);
        list.confirm();
        expect(handler).not.toHaveBeenCalled();
    });

    it('setItems() marks widget as dirty', () => {
        const list = new List(items);
        (list as any)._dirty = false;

        list.setItems([{ label: 'X', value: 'x' }]);
        expect(list.isDirty).toBe(true);
    });

    it('selectNext() marks widget as dirty', () => {
        const list = new List(items);
        (list as any)._dirty = false;

        list.selectNext();
        expect(list.isDirty).toBe(true);
    });
});
