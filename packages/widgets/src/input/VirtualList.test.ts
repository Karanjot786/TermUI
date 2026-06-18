// ─────────────────────────────────────────────────────
// Tests — VirtualList
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { VirtualList } from './VirtualList.js';
import { Widget } from '../base/Widget.js';
import { Screen } from '@termuijs/core';

function createList(totalItems = 100, options = {}) {
    return new VirtualList({
        totalItems,
        renderItem: (i) => `Item ${i}`,
        ...options,
    });
}

describe('VirtualList', () => {
    describe('construction', () => {
        it('creates with totalItems', () => {
            const list = createList(1000);
            expect(list.totalItems).toBe(1000);
            expect(list.selectedIndex).toBe(0);
            expect(list.scrollOffset).toBe(0);
        });

        it('is focusable', () => {
            const list = createList();
            expect(list.focusable).toBe(true);
        });
    });

    describe('navigation', () => {
        it('selectNext moves down', () => {
            const list = createList(10);
            list.selectNext();
            expect(list.selectedIndex).toBe(1);
            list.selectNext();
            expect(list.selectedIndex).toBe(2);
        });

        it('selectPrev moves up', () => {
            const list = createList(10);
            list.selectNext();
            list.selectNext();
            list.selectPrev();
            expect(list.selectedIndex).toBe(1);
        });

        it('selectPrev does not go below 0', () => {
            const list = createList(10);
            list.selectPrev();
            expect(list.selectedIndex).toBe(0);
        });

        it('selectNext does not exceed totalItems', () => {
            const list = createList(3);
            list.selectNext();
            list.selectNext();
            list.selectNext(); // Should not go past index 2
            expect(list.selectedIndex).toBe(2);
        });

        it('selectFirst jumps to beginning', () => {
            const list = createList(100);
            list.selectNext();
            list.selectNext();
            list.selectFirst();
            expect(list.selectedIndex).toBe(0);
        });

        it('selectLast jumps to end', () => {
            const list = createList(100);
            list.selectLast();
            expect(list.selectedIndex).toBe(99);
        });

        it('scrollTo jumps to specific index', () => {
            const list = createList(100);
            list.scrollTo(50);
            expect(list.selectedIndex).toBe(50);
        });

        it('scrollTo clamps to valid range', () => {
            const list = createList(100);
            list.scrollTo(-5);
            expect(list.selectedIndex).toBe(0);
            list.scrollTo(200);
            expect(list.selectedIndex).toBe(99);
        });
    });

    describe('data management', () => {
        it('setTotalItems updates the count', () => {
            const list = createList(100);
            list.selectLast(); // index 99
            list.setTotalItems(50);
            expect(list.totalItems).toBe(50);
            expect(list.selectedIndex).toBe(49); // clamped
        });

        it('setRenderItem updates the renderer', () => {
            const list = createList(10);
            const newRenderer = vi.fn((i: number) => `New-${i}`);
            list.setRenderItem(newRenderer);
            // Renderer is updated (verified via rendering)
            expect(list.totalItems).toBe(10);
        });

        it('setTotalItems to 0 clamps selection', () => {
            const list = createList(10);
            list.selectNext();
            list.setTotalItems(0);
            expect(list.selectedIndex).toBe(0);
        });
    });

    describe('confirm', () => {
        it('calls onSelect with selected index', () => {
            const onSelect = vi.fn();
            const list = new VirtualList({
                totalItems: 5,
                renderItem: (i) => `Item ${i}`,
                onSelect,
            });
            list.selectNext();
            list.selectNext();
            list.confirm();
            expect(onSelect).toHaveBeenCalledWith(2);
        });

        it('does nothing on empty list', () => {
            const onSelect = vi.fn();
            const list = new VirtualList({
                totalItems: 0,
                renderItem: (i) => `Item ${i}`,
                onSelect,
            });
            list.confirm();
            expect(onSelect).not.toHaveBeenCalled();
        });
    });

    describe('performance optimizations', () => {
        it('supports fixedItemHeight configuration', () => {
            const list = new VirtualList({
                totalItems: 10,
                fixedItemHeight: 3,
                renderItem: (i) => `Item ${i}`,
            });
            const screen = new Screen(40, 10);
            list.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            list.render(screen);

            // With border: single, content starts at y=1.
            // Item 0: y=1
            // Item 1: y=1+3=4
            expect(screen.getCell(3, 1)?.char).toBe('I'); // 'I' from 'Item 0'
            expect(screen.getCell(3, 4)?.char).toBe('I'); // 'I' from 'Item 1'
            expect(screen.getCell(3, 7)?.char).toBe('I'); // 'I' from 'Item 2'
        });

        it('bypasses layout engine dirtying on scrolling when memoizeLayout is true', () => {
            const list = createList(10, {
                totalItems: 10,
                memoizeLayout: true,
            });

            const markDirtySpy = vi.spyOn(Widget.prototype, 'markDirty');
            list.clearDirty();

            list.selectNext();

            expect(list.isDirty).toBe(true);
            // Should NOT call super.markDirty() which invalidates layout
            expect(markDirtySpy).not.toHaveBeenCalled();
            
            markDirtySpy.mockRestore();
        });

        it('does NOT bypass layout engine dirtying on scrolling when memoizeLayout is false', () => {
            const list = createList(10, {
                totalItems: 10,
                memoizeLayout: false,
            });

            const markDirtySpy = vi.spyOn(Widget.prototype, 'markDirty');
            list.clearDirty();

            list.selectNext();

            expect(list.isDirty).toBe(true);
            // Should call super.markDirty()
            expect(markDirtySpy).toHaveBeenCalled();
            
            markDirtySpy.mockRestore();
        });

        it('clears render cache when data/style changes', () => {
            const initialRenderItem = vi.fn((i: number) => `Item ${i}`);
            const list = new VirtualList({
                totalItems: 10,
                renderItem: initialRenderItem,
            });

            const screen = new Screen(40, 10);
            list.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            list.render(screen);

            const initialCalls = initialRenderItem.mock.calls.length;
            expect(initialCalls).toBeGreaterThan(0);

            // Render again - should be cached
            list.render(screen);
            expect(initialRenderItem.mock.calls.length).toBe(initialCalls);

            // Update - should clear cache
            const newRenderItem = vi.fn((i: number) => `New ${i}`);
            list.setRenderItem(newRenderItem);
            list.render(screen);
            // The initial render item should not have been called again
            expect(initialRenderItem.mock.calls.length).toBe(initialCalls);
            // The new render item should have been called
            expect(newRenderItem.mock.calls.length).toBeGreaterThan(0);

            const callsAfterUpdate = newRenderItem.mock.calls.length;
            list.setTotalItems(5);
            list.render(screen);
            expect(newRenderItem.mock.calls.length).toBeGreaterThan(callsAfterUpdate);
        });
    });
});
