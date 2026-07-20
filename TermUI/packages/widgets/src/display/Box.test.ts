// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Box widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Box } from './Box.js';
import { Screen } from '@termuijs/core';

describe('Box', () => {
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
});
