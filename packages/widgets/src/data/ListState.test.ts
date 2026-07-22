// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for useListState
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { useListState } from './ListState.js';
import type { ListItem } from '../input/List.js';

// ── Helpers ───────────────────────────────────────────

const makeItems = (): ListItem[] => [
    { label: 'Apple',  value: 'apple'  },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
];

const makeItemsWithDisabled = (): ListItem[] => [
    { label: 'Apple',  value: 'apple'  },
    { label: 'Banana', value: 'banana', disabled: true },
    { label: 'Cherry', value: 'cherry' },
];

// ── Tests ─────────────────────────────────────────────

describe('useListState', () => {

    // ── initialization ────────────────────────────────

    it('initializes with provided items', () => {
        const state = useListState({ items: makeItems() });
        expect(state.items).toHaveLength(3);
    });

    it('initializes selectedIndex to 0', () => {
        const state = useListState({ items: makeItems() });
        expect(state.selectedIndex).toBe(0);
    });

    it('initializes scrollOffset to 0', () => {
        const state = useListState({ items: makeItems() });
        expect(state.scrollOffset).toBe(0);
    });

    // ── setItems ──────────────────────────────────────

    it('setItems() updates the items list', () => {
        const state = useListState({ items: makeItems() });
        const newItems: ListItem[] = [{ label: 'Mango', value: 'mango' }];
        state.setItems(newItems);
        expect(state.items).toHaveLength(1);
        expect(state.items[0].value).toBe('mango');
    });

    it('setItems() clamps selectedIndex when new list is shorter', () => {
        const state = useListState({ items: makeItems() });
        state.selectNext();
        state.selectNext(); // selectedIndex = 2
        state.setItems([{ label: 'Only', value: 'only' }]);
        expect(state.selectedIndex).toBe(0);
    });

    it('setItems() keeps selectedIndex when still valid', () => {
        const state = useListState({ items: makeItems() });
        state.selectNext(); // selectedIndex = 1
        state.setItems(makeItems()); // same length
        expect(state.selectedIndex).toBe(1);
    });

    it('setItems() handles empty list and resets selectedIndex to 0', () => {
        const state = useListState({ items: makeItems() });
        state.selectNext();
        state.setItems([]);
        expect(state.selectedIndex).toBe(0);
    });

    // ── selectNext ────────────────────────────────────

    it('selectNext() moves selection forward', () => {
        const state = useListState({ items: makeItems() });
        state.selectNext();
        expect(state.selectedIndex).toBe(1);
    });

    it('selectNext() does not go past last item', () => {
        const state = useListState({ items: makeItems() });
        state.selectNext();
        state.selectNext();
        state.selectNext(); // already at last
        expect(state.selectedIndex).toBe(2);
    });

    it('selectNext() skips disabled items', () => {
        const state = useListState({ items: makeItemsWithDisabled() });
        state.selectNext(); // index 1 is disabled → skips to 2
        expect(state.selectedIndex).toBe(2);
    });

    // ── selectPrev ────────────────────────────────────

    it('selectPrev() moves selection backward', () => {
        const state = useListState({ items: makeItems() });
        state.selectNext();
        state.selectNext(); // at 2
        state.selectPrev();
        expect(state.selectedIndex).toBe(1);
    });

    it('selectPrev() does not go below 0', () => {
        const state = useListState({ items: makeItems() });
        state.selectPrev(); // already at 0
        expect(state.selectedIndex).toBe(0);
    });

    it('selectPrev() skips disabled items', () => {
        const state = useListState({ items: makeItemsWithDisabled() });
        state.selectNext(); // skips to index 2 (banana disabled)
        state.selectPrev(); // index 1 is disabled → skips to 0
        expect(state.selectedIndex).toBe(0);
    });

    it('selectPrev() updates scrollOffset when selection goes above it', () => {
        const state = useListState({ items: makeItems() });
        state.selectNext();
        state.selectNext(); // at 2, scrollOffset still 0
        state.scrollOffset = 2; // simulate scrolled down
        state.selectPrev(); // goes to 1, which is < scrollOffset
        expect(state.scrollOffset).toBe(1);
    });

    // ── confirm ───────────────────────────────────────

    it('confirm() is callable without throwing', () => {
        const state = useListState({ items: makeItems() });
        expect(() => state.confirm()).not.toThrow();
    });
});
