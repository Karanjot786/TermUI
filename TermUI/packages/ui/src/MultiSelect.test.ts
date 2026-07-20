// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for MultiSelect component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { MultiSelect } from './MultiSelect.js';

const OPTIONS = [
    { label: 'Red', value: 'red' },
    { label: 'Green', value: 'green' },
    { label: 'Blue', value: 'blue' },
];

describe('MultiSelect', () => {
    it('initializes with no items checked', () => {
        const ms = new MultiSelect(OPTIONS);
        expect(ms.selectedOptions).toHaveLength(0);
    });

    it('toggleCurrent checks current item', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toHaveLength(1);
    });

    it('toggleCurrent unchecks already checked item', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        ms.toggleCurrent();
        expect(ms.selectedOptions).toHaveLength(0);
    });

    it('selectNext moves to next item', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.selectNext();
        ms.toggleCurrent();
        // Should have checked the second item (Green)
        expect(ms.selectedOptions).toEqual([OPTIONS[1]]);
    });

    it('selectPrev moves to previous item', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.selectNext(); // 1
        ms.selectPrev(); // 0
        ms.toggleCurrent();
        expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
    });

    it('multiple items can be checked', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent(); // check 0
        ms.selectNext();
        ms.toggleCurrent(); // check 1
        expect(ms.selectedOptions).toHaveLength(2);
    });

    it('submit calls onSubmit with selected items', () => {
        const onSubmit = vi.fn();
        const ms = new MultiSelect(OPTIONS, { onSubmit });
        ms.toggleCurrent(); // check Red
        ms.submit();
        expect(onSubmit).toHaveBeenCalledWith([OPTIONS[0]]);
    });

    it('boundary: selectPrev at 0 stays at 0', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.selectPrev();
        ms.toggleCurrent();
        expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
    });
});
