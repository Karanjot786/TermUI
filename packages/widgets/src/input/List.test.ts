// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for List widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
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

    it('mouse events emitted on the widget trigger List selection and confirmation', () => {
        const handler = vi.fn();
        const list = new List(items, {}, handler);
        list.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        list.events.emit('mouse', { x: 1, y: 2, type: 'mousedown', button: 'left' });
        expect(list.selectedIndex).toBe(1);

        list.events.emit('mouse', { x: 1, y: 2, type: 'mouseup', button: 'left' });
        expect(handler).toHaveBeenCalledWith(items[1], 1);
    });

    it('mousedown on one item and mouseup on another confirms the originally selected item', () => {
        const handler = vi.fn();
        const list = new List(items, {}, handler);
        list.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        list.events.emit('mouse', { x: 1, y: 2, type: 'mousedown', button: 'left' });
        expect(list.selectedIndex).toBe(1);

        list.events.emit('mouse', { x: 1, y: 3, type: 'mouseup', button: 'left' });
        expect(list.selectedIndex).toBe(1);
        expect(handler).toHaveBeenCalledWith(items[1], 1);
    });

    it('mouse clicks on disabled items do not select or confirm', () => {
        const handler = vi.fn();
        const disabledItems: ListItem[] = [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b', disabled: true },
            { label: 'C', value: 'c' },
        ];
        const list = new List(disabledItems, {}, handler);
        list.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        // y=2 hits the second visible item inside the bordered content area.
        list.events.emit('mouse', { x: 1, y: 2, type: 'mousedown', button: 'left' });
        expect(list.selectedIndex).toBe(0);

        list.events.emit('mouse', { x: 1, y: 2, type: 'mouseup', button: 'left' });
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

        it('renders emptyMessage when the list is empty', () => {
        const list = new List({ items: [], emptyMessage: 'No files found' });
        list.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        
        const screen = new Screen(20, 3);
        list.render(screen);

        const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('\n');
        expect(rendered).toContain('No files found');
    });

    describe('Type-to-select navigation', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('subscribes to key events and invokes handleKey', () => {
            const list = new List(items);
            
            // Firing a key event should invoke the bound handleKey
            list.events.emit('key', { key: 'b' } as any);
            expect(list.selectedIndex).toBe(1); // 'Banana'
        });

        it('navigates to item matching single character', () => {
            const list = new List(items);
            list.handleKey({ key: 'c' } as any);
            expect(list.selectedIndex).toBe(2); // 'Cherry'
        });

        it('accumulates characters for multi-letter search within timeout', () => {
            const list = new List([
                { label: 'Apple', value: 'apple' },
                { label: 'Apricot', value: 'apricot' },
                { label: 'Banana', value: 'banana' },
            ]);
            
            // 'a' jumps to Apple
            list.handleKey({ key: 'a' } as any);
            expect(list.selectedIndex).toBe(0);
            
            // quickly 'p' and 'r' jumps to Apricot
            list.handleKey({ key: 'p' } as any);
            list.handleKey({ key: 'r' } as any);
            expect(list.selectedIndex).toBe(1);
        });

        it('resets the search buffer after 500ms', () => {
            const list = new List([
                { label: 'Apple', value: 'apple' },
                { label: 'Apricot', value: 'apricot' },
                { label: 'Banana', value: 'banana' },
            ]);
            
            // 'a' jumps to Apple
            list.handleKey({ key: 'a' } as any);
            expect(list.selectedIndex).toBe(0);
            
            // wait 500+ ms
            vi.advanceTimersByTime(550);
            
            // 'b' jumps to Banana (not 'apb' which doesn't exist)
            list.handleKey({ key: 'b' } as any);
            expect(list.selectedIndex).toBe(2);
        });
    });
});
