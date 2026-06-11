// @termuijs/ui - Tests for ContentSwitcher component

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { ContentSwitcher } from './ContentSwitcher.js';
import { Box } from '@termuijs/widgets';
import { Text } from '@termuijs/widgets';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('ContentSwitcher', () => {
    // ── Existing tests (preserved) ──────────────────────────────────────────

    it('initial active child is the first added child', () => {
        const switcher = new ContentSwitcher();
        const first = new Box();
        const second = new Box();

        switcher.addChild(first);
        switcher.addChild(second);

        expect(switcher.activeId).toBe(first.id);
        expect(first.style.visible).toBe(true);
        expect(second.style.visible).toBe(false);
    });

    it('setActive(id) changes the active child by id', () => {
        const switcher = new ContentSwitcher();
        const first = new Box();
        const second = new Box();

        switcher.addChild(first);
        switcher.addChild(second);
        switcher.setActive(second.id);

        expect(switcher.activeId).toBe(second.id);
        expect(first.style.visible).toBe(false);
        expect(second.style.visible).toBe(true);
    });

    it('invalid ids are ignored', () => {
        const switcher = new ContentSwitcher();
        const first = new Box();

        switcher.addChild(first);
        const originalId = switcher.activeId;

        switcher.setActive('invalid-id');

        expect(switcher.activeId).toBe(originalId);
        expect(first.style.visible).toBe(true);
    });

    it('only the active child is visible', () => {
        const switcher = new ContentSwitcher();
        const first = new Box();
        const second = new Box();
        const third = new Box();

        switcher.addChild(first);
        switcher.addChild(second);
        switcher.addChild(third);

        switcher.setActive(third.id);

        expect(first.style.visible).toBe(false);
        expect(second.style.visible).toBe(false);
        expect(third.style.visible).toBe(true);
    });

    // ── Test 1: Empty ContentSwitcher state ─────────────────────────────────

    it('empty switcher has undefined activeId and renders without error', () => {
        const switcher = new ContentSwitcher();

        expect(switcher.activeId).toBeUndefined();

        const screen = new Screen(40, 10);
        switcher.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        expect(() => switcher.render(screen)).not.toThrow();

        expect(switcher.children.length).toBe(0);
    });

    // ── Test 2: First child becomes active ──────────────────────────────────

    it('first added child becomes the active child', () => {
        const switcher = new ContentSwitcher();
        const child = new Box();

        switcher.addChild(child);

        expect(switcher.activeId).toBe(child.id);
        expect(child.style.visible).toBe(true);
    });

    // ── Test 3: Additional children start hidden ────────────────────────────

    it('children added after the first are hidden and first stays active', () => {
        const switcher = new ContentSwitcher();
        const first = new Box();
        const second = new Box();
        const third = new Box();

        switcher.addChild(first);
        switcher.addChild(second);
        switcher.addChild(third);

        expect(switcher.activeId).toBe(first.id);
        expect(first.style.visible).toBe(true);
        expect(second.style.visible).toBe(false);
        expect(third.style.visible).toBe(false);

        const visible = switcher.children.filter(c => c.style.visible !== false);
        expect(visible.length).toBe(1);
    });

    // ── Test 4: setActive() updates active child ────────────────────────────

    it('setActive() makes the target visible and hides the previous active', () => {
        const switcher = new ContentSwitcher();
        const first = new Box();
        const second = new Box();
        const third = new Box();

        switcher.addChild(first);
        switcher.addChild(second);
        switcher.addChild(third);

        switcher.setActive(second.id);

        expect(switcher.activeId).toBe(second.id);
        expect(second.style.visible).toBe(true);
        expect(first.style.visible).toBe(false);
        expect(third.style.visible).toBe(false);
    });

    // ── Test 5: setActive() with current active id is a no-op ───────────────

    it('setActive() with the current active id does not change visibility', () => {
        const switcher = new ContentSwitcher();
        const first = new Box();
        const second = new Box();

        switcher.addChild(first);
        switcher.addChild(second);

        // Capture state before the redundant call
        const idBefore = switcher.activeId;
        switcher.setActive(first.id);

        expect(switcher.activeId).toBe(idBefore);
        expect(first.style.visible).toBe(true);
        expect(second.style.visible).toBe(false);
    });

    // ── Test 6: Invalid IDs are ignored (extended) ──────────────────────────

    it('setActive() with an unknown id leaves state fully unchanged', () => {
        const switcher = new ContentSwitcher();
        const first = new Box();
        const second = new Box();

        switcher.addChild(first);
        switcher.addChild(second);
        switcher.setActive(second.id);

        expect(() => switcher.setActive('does-not-exist')).not.toThrow();

        expect(switcher.activeId).toBe(second.id);
        expect(first.style.visible).toBe(false);
        expect(second.style.visible).toBe(true);
    });

    // ── Test 7: Visibility consistency after multiple switches ───────────────

    it('visibility is exclusive after multiple sequential switches', () => {
        const switcher = new ContentSwitcher();
        const child1 = new Box();
        const child2 = new Box();
        const child3 = new Box();

        switcher.addChild(child1);
        switcher.addChild(child2);
        switcher.addChild(child3);

        switcher.setActive(child2.id);
        switcher.setActive(child3.id);
        switcher.setActive(child1.id);

        expect(switcher.activeId).toBe(child1.id);
        expect(child1.style.visible).toBe(true);
        expect(child2.style.visible).toBe(false);
        expect(child3.style.visible).toBe(false);
    });

    // ── Test 8: Exactly one child visible at all times ──────────────────────

    it('exactly one child is visible after every switch', () => {
        const switcher = new ContentSwitcher();
        const children = [new Box(), new Box(), new Box(), new Box()];
        for (const c of children) switcher.addChild(c);

        const countVisible = () =>
            switcher.children.filter(c => c.style.visible !== false).length;

        expect(countVisible()).toBe(1);

        switcher.setActive(children[1].id);
        expect(countVisible()).toBe(1);

        switcher.setActive(children[3].id);
        expect(countVisible()).toBe(1);

        switcher.setActive(children[0].id);
        expect(countVisible()).toBe(1);
    });

    // ── Test 9: addChild() after active child exists ─────────────────────────

    it('adding a child after active is set keeps active unchanged and new child hidden', () => {
        const switcher = new ContentSwitcher();
        const child1 = new Box();
        const child2 = new Box();

        switcher.addChild(child1);
        switcher.addChild(child2);

        const child3 = new Box();
        switcher.addChild(child3);

        expect(switcher.activeId).toBe(child1.id);
        expect(child3.style.visible).toBe(false);
        expect(switcher.children.filter(c => c.style.visible !== false).length).toBe(1);
    });

    // ── Test 10: Active child persists across new additions ──────────────────

    it('active child remains unchanged when new children are added after a switch', () => {
        const switcher = new ContentSwitcher();
        const child1 = new Box();
        const child2 = new Box();
        const child3 = new Box();

        switcher.addChild(child1);
        switcher.addChild(child2);
        switcher.addChild(child3);

        switcher.setActive(child2.id);

        const child4 = new Box();
        switcher.addChild(child4);

        expect(switcher.activeId).toBe(child2.id);
        expect(child2.style.visible).toBe(true);
        expect(child4.style.visible).toBe(false);
    });

    // ── Test 11: Large child counts ─────────────────────────────────────────

    it('handles 100 children without errors and keeps exactly one visible', () => {
        const switcher = new ContentSwitcher();
        const children: Box[] = [];

        for (let i = 0; i < 100; i++) {
            const child = new Box();
            children.push(child);
            switcher.addChild(child);
        }

        expect(() => switcher.setActive(children[50].id)).not.toThrow();

        expect(switcher.activeId).toBe(children[50].id);
        const visible = switcher.children.filter(c => c.style.visible !== false);
        expect(visible.length).toBe(1);
        expect(visible[0].id).toBe(children[50].id);
    });

    // ── Test 12: Rendering with active child ────────────────────────────────

    it('active child content appears in the rendered screen', () => {
        const switcher = new ContentSwitcher();
        const activeText = new Text('ACTIVE_CONTENT');
        const hiddenText = new Text('HIDDEN_CONTENT');

        switcher.addChild(activeText);
        switcher.addChild(hiddenText);

        const screen = new Screen(40, 5);
        switcher.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        activeText.updateRect({ x: 0, y: 0, width: 40, height: 5 });

        switcher.render(screen);

        const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('');
        expect(rendered).toContain('ACTIVE_CONTENT');
        expect(rendered).not.toContain('HIDDEN_CONTENT');
    });

    // ── Test 13: Rendering after active switch ───────────────────────────────

    it('new active child content appears after switching and previous disappears', () => {
        const switcher = new ContentSwitcher();
        const firstText = new Text('FIRST_PANEL');
        const secondText = new Text('SECOND_PANEL');

        switcher.addChild(firstText);
        switcher.addChild(secondText);

        const screen1 = new Screen(40, 5);
        switcher.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        firstText.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        switcher.render(screen1);

        const before = screen1.back.map(row => row.map(c => c.char).join('')).join('');
        expect(before).toContain('FIRST_PANEL');

        switcher.setActive(secondText.id);
        secondText.updateRect({ x: 0, y: 0, width: 40, height: 5 });

        const screen2 = new Screen(40, 5);
        switcher.render(screen2);

        const after = screen2.back.map(row => row.map(c => c.char).join('')).join('');
        expect(after).toContain('SECOND_PANEL');
        expect(after).not.toContain('FIRST_PANEL');
    });

    // ── Test 14: style.visible flags match active state ─────────────────────

    it('style.visible matches active state for every child after each switch', () => {
        const switcher = new ContentSwitcher();
        const children = [new Box(), new Box(), new Box()];
        for (const c of children) switcher.addChild(c);

        const assertVisibility = (activeIndex: number) => {
            for (let i = 0; i < children.length; i++) {
                expect(children[i].style.visible).toBe(i === activeIndex);
                expect(children[i].id === switcher.activeId).toBe(i === activeIndex);
            }
        };

        assertVisibility(0);

        switcher.setActive(children[1].id);
        assertVisibility(1);

        switcher.setActive(children[2].id);
        assertVisibility(2);

        switcher.setActive(children[0].id);
        assertVisibility(0);
    });

    // ── Test 15: Repeated invalid setActive() calls ──────────────────────────

    it('repeated invalid setActive() calls keep state stable', () => {
        const switcher = new ContentSwitcher();
        const child = new Box();
        switcher.addChild(child);

        for (let i = 0; i < 10; i++) {
            expect(() => switcher.setActive('bad-id')).not.toThrow();
        }

        expect(switcher.activeId).toBe(child.id);
        expect(child.style.visible).toBe(true);
    });

    // ── Test 16: Switching back to original child ────────────────────────────

    it('switching back to original child restores exclusive visibility', () => {
        const switcher = new ContentSwitcher();
        const child1 = new Box();
        const child2 = new Box();

        switcher.addChild(child1);
        switcher.addChild(child2);

        switcher.setActive(child2.id);
        switcher.setActive(child1.id);

        expect(switcher.activeId).toBe(child1.id);
        expect(child1.style.visible).toBe(true);
        expect(child2.style.visible).toBe(false);
    });

    // ── Test 17: activeId getter accuracy ───────────────────────────────────

    it('activeId getter always reflects the visible child after every valid switch', () => {
        const switcher = new ContentSwitcher();
        const children = [new Box(), new Box(), new Box()];
        for (const c of children) switcher.addChild(c);

        for (const target of [children[2], children[0], children[1], children[2]]) {
            switcher.setActive(target.id);
            expect(switcher.activeId).toBe(target.id);
            const visibleChild = switcher.children.find(c => c.style.visible !== false);
            expect(visibleChild?.id).toBe(switcher.activeId);
        }
    });

    // ── Test 18: ContentSwitcher with exactly one child ──────────────────────

    it('single-child switcher stays active and setActive on itself is safe', () => {
        const switcher = new ContentSwitcher();
        const child = new Box();
        switcher.addChild(child);

        expect(() => switcher.setActive(child.id)).not.toThrow();
        expect(switcher.activeId).toBe(child.id);
        expect(child.style.visible).toBe(true);
    });

    // ── Test 19: Focus/Render stability under repeated switches ──────────────

    it('repeated renders while switching active children produce no errors', () => {
        const switcher = new ContentSwitcher();
        const children = [new Box(), new Box(), new Box()];
        for (const c of children) switcher.addChild(c);

        switcher.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        for (let round = 0; round < 5; round++) {
            for (const target of children) {
                switcher.setActive(target.id);
                const screen = new Screen(40, 10);
                expect(() => switcher.render(screen)).not.toThrow();
                expect(switcher.activeId).toBe(target.id);
                const visible = switcher.children.filter(c => c.style.visible !== false);
                expect(visible.length).toBe(1);
            }
        }
    });

    // ── Test 20: markDirty is triggered correctly ────────────────────────────

    it('setActive() triggers markDirty on a valid id change', () => {
        const switcher = new ContentSwitcher();
        const child1 = new Box();
        const child2 = new Box();

        switcher.addChild(child1);
        switcher.addChild(child2);

        // Clear the dirty flag so we start from a clean state
        switcher.clearDirty();

        const spy = vi.spyOn(switcher, 'markDirty');

        switcher.setActive(child2.id);
        // markDirty is called at least once: directly in setActive() and
        // potentially via child.setStyle() propagation — either way the
        // switcher must be dirtied when the active child changes.
        expect(spy).toHaveBeenCalled();
    });

    it('setActive() with the current id does not trigger markDirty', () => {
        const switcher = new ContentSwitcher();
        const child1 = new Box();
        switcher.addChild(child1);
        switcher.clearDirty();

        const spy = vi.spyOn(switcher, 'markDirty');

        switcher.setActive(child1.id);
        expect(spy).not.toHaveBeenCalled();
    });

    it('setActive() with an invalid id does not trigger markDirty', () => {
        const switcher = new ContentSwitcher();
        const child1 = new Box();
        switcher.addChild(child1);
        switcher.clearDirty();

        const spy = vi.spyOn(switcher, 'markDirty');

        switcher.setActive('nonexistent');
        expect(spy).not.toHaveBeenCalled();
    });
});
