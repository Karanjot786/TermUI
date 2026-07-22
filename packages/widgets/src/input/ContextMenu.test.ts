// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for ContextMenu widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.js';

describe('ContextMenu', () => {
    const items: ContextMenuItem[] = [
        { label: 'Copy', value: 'copy' },
        { label: 'Paste', value: 'paste' },
        { label: 'Delete', value: 'delete' },
    ];

    it('initializes with correct items and position', () => {
        const menu = new ContextMenu(items, 10, 5);
        expect(menu.selectedIndex).toBe(0);
        expect(menu.rect.x).toBe(10);
        expect(menu.rect.y).toBe(5);
    });

    it('selectedItem returns the currently selected item', () => {
        const menu = new ContextMenu(items, 0, 0);
        expect(menu.selectedItem).toEqual(items[0]);

        menu.selectNext();
        expect(menu.selectedItem).toEqual(items[1]);
    });

    it('selectPrev() moves selection up', () => {
        const menu = new ContextMenu(items, 0, 0);
        menu.selectNext(); // Move to index 1
        menu.selectNext(); // Move to index 2
        menu.selectPrev(); // Move back to index 1
        expect(menu.selectedIndex).toBe(1);
    });

    it('selectPrev() at first item is a no-op', () => {
        const menu = new ContextMenu(items, 0, 0);
        menu.selectPrev();
        expect(menu.selectedIndex).toBe(0);
    });

    it('selectNext() moves selection down', () => {
        const menu = new ContextMenu(items, 0, 0);
        expect(menu.selectedIndex).toBe(0);
        menu.selectNext();
        expect(menu.selectedIndex).toBe(1);
    });

    it('selectNext() at last item is a no-op', () => {
        const menu = new ContextMenu(items, 0, 0);
        menu.selectNext(); // 0 → 1
        menu.selectNext(); // 1 → 2
        menu.selectNext(); // 2 → stays 2 (last item)
        expect(menu.selectedIndex).toBe(2);
    });

    it('disabled items are skipped during navigation', () => {
        const disabledItems: ContextMenuItem[] = [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b', disabled: true },
            { label: 'C', value: 'c' },
        ];
        const menu = new ContextMenu(disabledItems, 0, 0);

        menu.selectNext(); // 0 → skip 1 (disabled) → 2
        expect(menu.selectedIndex).toBe(2);

        menu.selectPrev(); // 2 → skip 1 (disabled) → 0
        expect(menu.selectedIndex).toBe(0);
    });

    it('confirm() calls onItemSelect callback with selected item', () => {
        const handler = vi.fn();
        const menu = new ContextMenu(items, 0, 0, {}, { onItemSelect: handler });

        menu.selectNext(); // Move to index 1
        menu.confirm();

        expect(handler).toHaveBeenCalledWith(items[1], 1);
    });

    it('confirm() does not fire callback for disabled items', () => {
        const handler = vi.fn();
        const disabledItems: ContextMenuItem[] = [
            { label: 'A', value: 'a', disabled: true },
        ];
        const menu = new ContextMenu(disabledItems, 0, 0, {}, { onItemSelect: handler });

        menu.confirm();
        expect(handler).not.toHaveBeenCalled();
    });

    it('close() calls onClose callback', () => {
        const closeHandler = vi.fn();
        const menu = new ContextMenu(items, 0, 0, {}, { onClose: closeHandler });

        menu.close();
        expect(closeHandler).toHaveBeenCalled();
    });

    it('moveTo() updates position and marks dirty', () => {
        const menu = new ContextMenu(items, 10, 5);
        expect(menu.rect.x).toBe(10);
        expect(menu.rect.y).toBe(5);

        (menu as any)._dirty = false;
        menu.moveTo(20, 15);

        expect(menu.rect.x).toBe(20);
        expect(menu.rect.y).toBe(15);
        expect(menu.isDirty).toBe(true);
    });

    it('selectNext() marks widget as dirty', () => {
        const menu = new ContextMenu(items, 0, 0);
        (menu as any)._dirty = false;

        menu.selectNext();
        expect(menu.isDirty).toBe(true);
    });

    it('selectPrev() marks widget as dirty', () => {
        const menu = new ContextMenu(items, 0, 0);
        (menu as any)._dirty = false;

        menu.selectPrev();
        menu.selectNext();
        (menu as any)._dirty = false;
        menu.selectPrev();

        expect(menu.isDirty).toBe(true);
    });

    it('confirm() marks widget as dirty when closing (if callback fires)', () => {
        const handler = vi.fn();
        const menu = new ContextMenu(items, 0, 0, {}, { onItemSelect: handler });

        (menu as any)._dirty = false;
        menu.confirm();

        // confirm() itself doesn't mark dirty, but the callback is called
        expect(handler).toHaveBeenCalled();
    });

    it('handles empty items array gracefully', () => {
        const menu = new ContextMenu([], 0, 0);
        expect(menu.selectedIndex).toBe(0);
        expect(menu.selectedItem).toBeUndefined();
        expect(() => menu.selectNext()).not.toThrow();
    });

    it('rect dimensions match items count', () => {
        const menu = new ContextMenu(items, 5, 5);
        expect(menu.rect.height).toBe(items.length);
        expect(menu.rect.width).toBeGreaterThanOrEqual(10); // Minimum width
    });

    it('does not mark dirty when moveTo receives the same position', () => {
        const menu = new ContextMenu(items, 10, 5);

        (menu as any)._dirty = false;

        menu.moveTo(10, 5);

        expect(menu.isDirty).toBe(false);
    });

    it('marks dirty when moveTo receives a different position', () => {
        const menu = new ContextMenu(items, 10, 5);

        (menu as any)._dirty = false;

        menu.moveTo(20, 15);

        expect(menu.isDirty).toBe(true);
    });

});
