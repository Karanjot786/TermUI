// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Select component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Select } from './Select.js';

const OPTIONS = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
];

describe('Select', () => {
    it('initializes with selectedIndex=0 and closed', () => {
        const sel = new Select(OPTIONS);
        expect(sel.selectedIndex).toBe(0);
        expect(sel.isOpen).toBe(false);
    });

    it('initializes on the first enabled option', () => {
        const sel = new Select([
            { label: 'Unavailable', value: 'unavailable', disabled: true },
            { label: 'Available', value: 'available' },
        ]);

        expect(sel.selectedIndex).toBe(1);
        expect(sel.selectedOption?.value).toBe('available');
    });

    it('uses no selected option when every option is disabled', () => {
        const sel = new Select([
            { label: 'Unavailable', value: 'unavailable', disabled: true },
        ]);

        expect(sel.selectedIndex).toBe(-1);
        expect(sel.selectedOption).toBeUndefined();
    });

    it('open() sets isOpen to true', () => {
        const sel = new Select(OPTIONS);
        sel.open();
        expect(sel.isOpen).toBe(true);
    });

    it('close() sets isOpen to false', () => {
        const sel = new Select(OPTIONS);
        sel.open();
        sel.close();
        expect(sel.isOpen).toBe(false);
    });

    it('selectNext increments selectedIndex', () => {
        const sel = new Select(OPTIONS);
        sel.selectNext();
        expect(sel.selectedIndex).toBe(1);
    });

    it('selectPrev decrements selectedIndex', () => {
        const sel = new Select(OPTIONS);
        sel.selectNext();
        sel.selectPrev();
        expect(sel.selectedIndex).toBe(0);
    });

    it('selectNext at last stays at last', () => {
        const sel = new Select(OPTIONS);
        sel.selectNext(); // 1
        sel.selectNext(); // 2
        sel.selectNext(); // stays at 2
        expect(sel.selectedIndex).toBe(2);
    });

    it('selectPrev at first stays at first', () => {
        const sel = new Select(OPTIONS);
        sel.selectPrev();
        expect(sel.selectedIndex).toBe(0);
    });

    it('confirm calls onSelect callback', () => {
        const onSelect = vi.fn();
        const sel = new Select(OPTIONS, { onSelect });
        sel.open();
        sel.selectNext(); // index 1 = banana
        sel.confirm();
        expect(onSelect).toHaveBeenCalledWith(OPTIONS[1], 1);
    });
});
