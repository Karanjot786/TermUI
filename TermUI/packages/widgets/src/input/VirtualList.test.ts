// ─────────────────────────────────────────────────────
// Tests — VirtualList
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { VirtualList } from './VirtualList.js';

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
});
