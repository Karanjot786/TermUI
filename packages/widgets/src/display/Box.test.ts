// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Box widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Box } from './Box.js';
import { Screen, mergeBorders } from '@termuijs/core';

describe('Box', () => {
        it('isEmpty returns true when no children', () => {
        const box = new Box();
        expect(box.isEmpty()).toBe(true);
    });

    it('isEmpty returns false when children are added', () => {
        const box = new Box();
        const child = new Box();
        box.addChild(child);
        expect(box.isEmpty()).toBe(false);
    });

    it('isEmpty returns true after all children are removed', () => {
        const box = new Box();
        const child = new Box();
        box.addChild(child);
        expect(box.isEmpty()).toBe(false);
        box.removeChild(child);
        expect(box.isEmpty()).toBe(true);
    });

    it('isEmpty returns true after clearChildren', () => {
        const box = new Box();
        box.addChild(new Box());
        box.addChild(new Box());
        expect(box.isEmpty()).toBe(false);
        box.clearChildren();
        expect(box.isEmpty()).toBe(true);
    });
    it('renders border characters for single border', () => {
        const box = new Box({ border: 'single', width: 5, height: 3 });
        const screen = new Screen(10, 5);
        box.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        box.render(screen);
        expect(screen.back[0][0].char).toBe('┌');
        expect(screen.back[0][4].char).toBe('┐');
        expect(screen.back[2][0].char).toBe('└');
        expect(screen.back[2][4].char).toBe('┘');
    });

    it('fills background when bg is set', () => {
        const box = new Box({ bg: { type: 'named', name: 'blue' }, width: 5, height: 3 });
        const screen = new Screen(10, 5);
        box.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        box.render(screen);
        expect(screen.back[1][2].bg).toEqual({ type: 'named', name: 'blue' });
    });

    it('no background fill when bg is none', () => {
        const box = new Box({ width: 5, height: 3 });
        const screen = new Screen(10, 5);
        box.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        box.render(screen);
        // Should remain default (space with no bg)
        expect(screen.back[1][2].char).toBe(' ');
    });

    it('addChild adds a widget to children', () => {
        const box = new Box({ width: 10, height: 5 });
        const child = new Box();
        box.addChild(child);
        expect(box.children).toContain(child);
    });

    it('creates empty box without errors', () => {
        expect(() => new Box()).not.toThrow();
    });
    it('supports adjacent box border docking', () => {
    const left = new Box({ border: 'single' });
    const right = new Box({ border: 'single' });

    const screen = new Screen(20, 10);

    left.updateRect({
        x: 0,
        y: 0,
        width: 10,
        height: 5,
    });

    right.updateRect({
        x: 9,
        y: 0,
        width: 10,
        height: 5,
    });

    left.render(screen);
    right.render(screen);

    mergeBorders(screen);

    expect(screen.back[2][9].char).not.toBe(' ');
});
    
it('supports a 2x2 box grid layout with merged borders', () => {
    const topLeft = new Box({ border: 'single' });
    const topRight = new Box({ border: 'single' });
    const bottomLeft = new Box({ border: 'single' });
    const bottomRight = new Box({ border: 'single' });

    const screen = new Screen(20, 10);

    topLeft.updateRect({
        x: 0,
        y: 0,
        width: 10,
        height: 5,
    });

    topRight.updateRect({
        x: 9,
        y: 0,
        width: 10,
        height: 5,
    });

    bottomLeft.updateRect({
        x: 0,
        y: 4,
        width: 10,
        height: 5,
    });

    bottomRight.updateRect({
        x: 9,
        y: 4,
        width: 10,
        height: 5,
    });

    topLeft.render(screen);
    topRight.render(screen);
    bottomLeft.render(screen);
    bottomRight.render(screen);

    mergeBorders(screen);

    // Center intersection of the 2x2 grid
    expect(screen.back[4][9].char).toBe('┼');
  });
});
