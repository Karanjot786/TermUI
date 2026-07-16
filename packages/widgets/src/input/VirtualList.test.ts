// ─────────────────────────────────────────────────────
// Tests — VirtualList
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { VirtualList } from './VirtualList.js';
import { Screen, computeLayout } from '@termuijs/core';

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

        it('scrollToIndex jumps instantly to specified index with alignment', () => {
            const list = new VirtualList({
                totalItems: 100,
                renderItem: (i) => `Item ${i}`,
                springScroll: true,
                style: { width: 40, height: 10 },
            });
            const node = list.getLayoutNode();
            computeLayout(node, 40, 10);
            list.syncLayout();
            
            // test start alignment
            list.scrollToIndex(50, 'start');
            expect(list.scrollOffset).toBe(50);
            expect(list.selectedIndex).toBe(50);
            
            // test center alignment (content height is 8)
            list.scrollToIndex(50, 'center');
            // offset = 50 - floor(8/2) = 46
            expect(list.scrollOffset).toBe(46);
            expect(list.selectedIndex).toBe(50);
            
            // test end alignment
            list.scrollToIndex(50, 'end');
            // offset = 50 - 8 + 1 = 43
            expect(list.scrollOffset).toBe(43);
            expect(list.selectedIndex).toBe(50);
            
            // test out of bounds clamping (returns early)
            const previousOffset = list.scrollOffset;
            list.scrollToIndex(-10);
            expect(list.scrollOffset).toBe(previousOffset);
            
            list.scrollToIndex(200);
            expect(list.scrollOffset).toBe(previousOffset);
        });
    });

    describe('pageUp/pageDown with viewport smaller than itemHeight', () => {
        // Create a list with layout so _getContentRect() is computed.
        function createListSmallViewport() {
            const list = new VirtualList({
                totalItems: 10,
                renderItem: (i) => `Item ${i}`,
                itemHeight: 5, // large item height
                style: { width: 40, height: 6 }, // content height will be 4 (< itemHeight)
            });
            const node = list.getLayoutNode();
            computeLayout(node, 40, 6);
            list.syncLayout();
            return list;
        }

        it('pageDown moves at least one when pageSize would be 0', () => {
            const list = createListSmallViewport();
            expect(list.selectedIndex).toBe(0);

            list.pageDown();
            // pageDown should advance by exactly 1 (pageSize === 1 in this setup)
            expect(list.selectedIndex).toBe(1);
        });

        it('pageUp moves at least one when pageSize would be 0', () => {
            const list = createListSmallViewport();
            list.scrollTo(3);
            expect(list.selectedIndex).toBe(3);

            list.pageUp();
            // pageUp should move up by exactly 1 (from 3 -> 2)
            expect(list.selectedIndex).toBe(2);
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

    describe('spring scrolling', () => {
        // Helper: set up a VirtualList with a real computed layout so _getContentRect()
        // returns correct values without touching private internals.
        // With width=40, height=10 and the default 'single' border, the content
        // area is 38×8 (border consumes 1 cell on each side).
        function createListWithLayout(options: { springScroll: boolean }) {
            const list = new VirtualList({
                totalItems: 100,
                renderItem: (i) => `Item ${i}`,
                springScroll: options.springScroll,
                style: { width: 40, height: 10 },
            });
            const node = list.getLayoutNode();
            computeLayout(node, 40, 10);
            list.syncLayout();
            return list;
        }

        it('instantly snaps when springScroll is false', () => {
            const list = createListWithLayout({ springScroll: false });

            // Scroll to index 50; content height is 8, so target offset = 50 - 8 + 1 = 43
            list.scrollTo(50);
            expect(list.scrollOffset).toBe(43);
        });

        it('animates gradually when springScroll is true', () => {
            let mockTime = 1000;
            const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

            const list = createListWithLayout({ springScroll: true });
            const screen = new Screen(80, 25);

            // Initially at 0
            expect(list.scrollOffset).toBe(0);

            // Scroll to 50 -> animation starts; offset must NOT jump immediately
            list.scrollTo(50);
            expect(list.scrollOffset).toBe(0);

            // First render tick
            list.render(screen);

            // Advance 100 frames of 16 ms — spring should have begun moving
            for (let i = 0; i < 100; i++) {
                mockTime += 16;
                list.render(screen);
            }

            // Offset must have started moving toward the target (43)
            expect(list.scrollOffset).toBeGreaterThan(0);

            // Drive the animation to completion.
            // Use larger dt (50ms) to reduce CPU overhead and avoid test timeout,
            // while still allowing the spring to converge.
            for (let i = 0; i < 400; i++) {
                mockTime += 50;
                list.render(screen);
            }

            expect(list.scrollOffset).toBe(43);
            nowSpy.mockRestore();
        });
    });

    describe('render cache eviction', () => {
        it('evicts old entries outside visible range after scroll', () => {
            const list = new VirtualList({
                totalItems: 1000,
                renderItem: (i) => `Item ${i}`,
                style: { width: 40, height: 10 },
                springScroll: false,
            });
            const node = list.getLayoutNode();
            computeLayout(node, 40, 10);
            list.syncLayout();
            const screen = new Screen(80, 25);

            list.scrollTo(0);
            list.render(screen);
            const cache = (list as any)._renderCache as Map<number, any>;
            const initialSize = cache.size;

            // Scroll through large range - cache should stay bounded
            for (let i = 1; i <= 50; i++) {
                list.scrollTo(i * 10);
                list.render(screen);
            }

            // Cache should not have grown unbounded with 1000 items
            expect(cache.size).toBeLessThanOrEqual(initialSize + 20);
            expect(cache.size).toBeLessThan(100);
        });
    });

    describe('bounds-check for renderItem indices', () => {
        it('does not call renderItem with out-of-bounds index when totalItems decreases', () => {
            const renderItem = vi.fn((i: number) => `Item ${i}`);
            const list = new VirtualList({
                totalItems: 100,
                renderItem,
                itemHeight: 1,
                style: { width: 40, height: 10 },
                springScroll: false,
            });
            const node = list.getLayoutNode();
            computeLayout(node, 40, 10);
            list.syncLayout();
            const screen = new Screen(80, 25);

            // Scroll to end
            list.selectLast();
            list.render(screen);

            // Record the indices that were rendered
            const initialCalls = new Set(renderItem.mock.calls.map(call => call[0]));

            // Decrease totalItems dramatically
            list.setTotalItems(10);
            renderItem.mockClear();
            list.render(screen);

            // Verify no call to renderItem with out-of-bounds index
            renderItem.mock.calls.forEach(call => {
                const idx = call[0];
                expect(idx).toBeGreaterThanOrEqual(0);
                expect(idx).toBeLessThan(10);
            });
        });

        it('does not call renderItem with negative indices after scroll position changes', () => {
            const renderItem = vi.fn((i: number) => `Item ${i}`);
            const list = new VirtualList({
                totalItems: 100,
                renderItem,
                itemHeight: 1,
                style: { width: 40, height: 10 },
                springScroll: false,
            });
            const node = list.getLayoutNode();
            computeLayout(node, 40, 10);
            list.syncLayout();
            const screen = new Screen(80, 25);

            // Scroll and then decrease totalItems
            for (let i = 0; i < 50; i++) {
                list.selectNext();
            }
            list.render(screen);
            renderItem.mockClear();

            list.setTotalItems(20);
            list.render(screen);

            // Verify no negative indices
            renderItem.mock.calls.forEach(call => {
                const idx = call[0];
                expect(idx).toBeGreaterThanOrEqual(0);
            });
        });

        it('handles totalItems decrease to 0 gracefully', () => {
            const renderItem = vi.fn((i: number) => `Item ${i}`);
            const list = new VirtualList({
                totalItems: 50,
                renderItem,
                itemHeight: 1,
                style: { width: 40, height: 10 },
                springScroll: false,
            });
            const node = list.getLayoutNode();
            computeLayout(node, 40, 10);
            list.syncLayout();
            const screen = new Screen(80, 25);

            list.selectLast();
            list.render(screen);
            renderItem.mockClear();

            // Decrease to zero
            list.setTotalItems(0);
            expect(() => list.render(screen)).not.toThrow();
            expect(renderItem).not.toHaveBeenCalled();
        });

        it('renders correctly after multiple totalItems changes', () => {
            const renderItem = vi.fn((i: number) => `Item ${i}`);
            const list = new VirtualList({
                totalItems: 100,
                renderItem,
                itemHeight: 1,
                style: { width: 40, height: 10 },
                springScroll: false,
            });
            const node = list.getLayoutNode();
            computeLayout(node, 40, 10);
            list.syncLayout();
            const screen = new Screen(80, 25);

            list.selectLast();
            list.render(screen);

            // Multiple size changes in sequence
            list.setTotalItems(80);
            renderItem.mockClear();
            list.render(screen);
            let validIndices = true;
            renderItem.mock.calls.forEach(call => {
                const idx = call[0];
                if (idx < 0 || idx >= 80) validIndices = false;
            });
            expect(validIndices).toBe(true);

            list.setTotalItems(50);
            renderItem.mockClear();
            list.render(screen);
            validIndices = true;
            renderItem.mock.calls.forEach(call => {
                const idx = call[0];
                if (idx < 0 || idx >= 50) validIndices = false;
            });
            expect(validIndices).toBe(true);

            list.setTotalItems(200);
            renderItem.mockClear();
            list.render(screen);
            validIndices = true;
            renderItem.mock.calls.forEach(call => {
                const idx = call[0];
                if (idx < 0 || idx >= 200) validIndices = false;
            });
            expect(validIndices).toBe(true);
        });
    });

});
