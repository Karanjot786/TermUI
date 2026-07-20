// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Columns layout
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Columns } from './Columns.js';
import { Box } from '../display/Box.js';
import { Screen, computeLayout } from '@termuijs/core';

describe('Columns layout', () => {
    it('Two children split width evenly', () => {
        const col1 = new Box();
        const col2 = new Box();
        const widget = new Columns({ width: 40, height: 10 }, { gap: 0 });
        widget.addChild(col1);
        widget.addChild(col2);

        const node = widget.getLayoutNode();
        computeLayout(node, 40, 10);
        widget.syncLayout();

        expect(col1.rect.width).toBe(20);
        expect(col2.rect.width).toBe(20);
        expect(col1.rect.x).toBe(0);
        expect(col2.rect.x).toBe(20);
    });

    it('Three children split width evenly', () => {
        const col1 = new Box();
        const col2 = new Box();
        const col3 = new Box();
        const widget = new Columns({ width: 60, height: 10 }, { gap: 0 });
        widget.addChild(col1);
        widget.addChild(col2);
        widget.addChild(col3);

        const node = widget.getLayoutNode();
        computeLayout(node, 60, 10);
        widget.syncLayout();

        expect(col1.rect.width).toBe(20);
        expect(col2.rect.width).toBe(20);
        expect(col3.rect.width).toBe(20);
        expect(col1.rect.x).toBe(0);
        expect(col2.rect.x).toBe(20);
        expect(col3.rect.x).toBe(40);
    });

    it('gap option reduces child width proportionally', () => {
        const col1 = new Box();
        const col2 = new Box();
        const widget = new Columns({ width: 40, height: 10 }, { gap: 2 });
        widget.addChild(col1);
        widget.addChild(col2);

        const node = widget.getLayoutNode();
        computeLayout(node, 40, 10);
        widget.syncLayout();

        // 40 total width, 1 gap of size 2. Remaining = 38. 38 / 2 = 19 each.
        expect(col1.rect.width).toBe(19);
        expect(col2.rect.width).toBe(19);
    });

    it('Children render at correct x positions', () => {
        const col1 = new Box({ bg: { type: 'named', name: 'red' } });
        const col2 = new Box({ bg: { type: 'named', name: 'blue' } });
        const widget = new Columns({ width: 40, height: 10 }, { gap: 2 });
        widget.addChild(col1);
        widget.addChild(col2);

        const node = widget.getLayoutNode();
        computeLayout(node, 40, 10);
        widget.syncLayout();

        const screen = new Screen(40, 10);
        widget.render(screen);

        expect(col1.rect.x).toBe(0);
        expect(col2.rect.x).toBe(21);

        // Verify screen buffer colors at expected locations
        expect(screen.back[0][0].bg).toEqual({ type: 'named', name: 'red' });
        expect(screen.back[0][18].bg).toEqual({ type: 'named', name: 'red' });
        
        // Gap area should have default background
        expect(screen.back[0][19].bg).not.toEqual({ type: 'named', name: 'red' });
        expect(screen.back[0][19].bg).not.toEqual({ type: 'named', name: 'blue' });
        expect(screen.back[0][20].bg).not.toEqual({ type: 'named', name: 'red' });
        expect(screen.back[0][20].bg).not.toEqual({ type: 'named', name: 'blue' });
        
        // Start of col2
        expect(screen.back[0][21].bg).toEqual({ type: 'named', name: 'blue' });
        expect(screen.back[0][39].bg).toEqual({ type: 'named', name: 'blue' });
    });
});
