// packages/widgets/src/input/__tests__/List.state.test.ts
import { describe, it, expect, vi } from 'vitest';
import { useListState } from '../../data/ListState.js';

const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
    { label: 'Durian', value: 'durian', disabled: true },
    { label: 'Elderberry', value: 'elderberry' },
];

describe('useListState', () => {
    it('initialises with selectedIndex 0 and scrollOffset 0', () => {
        const s = useListState({ items });
        expect(s.selectedIndex).toBe(0);
        expect(s.scrollOffset).toBe(0);
        expect(s.items).toHaveLength(items.length);
    });

    it('selectNext moves selection forward', () => {
        const s = useListState({ items });
        s.selectNext();
        expect(s.selectedIndex).toBe(1);
    });

    it('selectPrev does nothing at index 0', () => {
        const s = useListState({ items });
        s.selectPrev();
        expect(s.selectedIndex).toBe(0);
    });

    it('selectNext skips disabled items', () => {
        const s = useListState({ items });
        s.selectNext(); // 0 → 1
        s.selectNext(); // 1 → 2
        s.selectNext(); // 2 → skips 3 (disabled) → 4
        expect(s.selectedIndex).toBe(4);
    });

    it('selectPrev skips disabled items', () => {
        const s = useListState({ items });
        // Jump to index 4 manually
        s.selectNext();
        s.selectNext();
        s.selectNext();
        expect(s.selectedIndex).toBe(4);
        s.selectPrev(); // 4 → skips 3 (disabled) → 2
        expect(s.selectedIndex).toBe(2);
    });

    it('setItems updates items and clamps selection', () => {
        const s = useListState({ items });
        s.selectNext();
        s.selectNext(); // selectedIndex = 2
        s.setItems(items.slice(0, 2)); // only 2 items now
        expect(s.items).toHaveLength(2);
        expect(s.selectedIndex).toBe(1); // clamped to last valid
    });

    it('two consumers sharing the same state stay in sync', () => {
        const s = useListState({ items });

        // Simulate consumer A advancing selection
        s.selectNext();

        // Consumer B reads the same state object
        expect(s.selectedIndex).toBe(1);
    });

    it('selectedIndex updates are reflected on the state object after selectNext', () => {
        const s = useListState({ items });
        expect(s.selectedIndex).toBe(0);
        s.selectNext();
        expect(s.selectedIndex).toBe(1);
        s.selectNext();
        expect(s.selectedIndex).toBe(2);
    });
});
