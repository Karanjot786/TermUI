// @termuijs/ui - Tests for ContentSwitcher component

import { describe, it, expect } from 'vitest';
import { ContentSwitcher } from './ContentSwitcher.js';
import { Box } from '@termuijs/widgets';

describe('ContentSwitcher', () => {
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
});
