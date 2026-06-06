// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Grid layout
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Grid } from './Grid.js';
import { Box } from '../display/Box.js';
import { computeLayout } from '@termuijs/core';

describe('Grid layout', () => {
    it('places children into rows based on column count', () => {
        const grid = new Grid(
            { width: 40, height: 20 },
            { columns: 2, gap: 0 }
        );
    
        const a = new Box();
        const b = new Box();
        const c = new Box();
    
        grid.addChild(a);
        grid.addChild(b);
        grid.addChild(c);
    
        const node = grid.getLayoutNode();
        computeLayout(node, 40, 20);
        grid.syncLayout();

    
        expect(grid.children.length).toBe(2);

        expect(a.rect.x).toBe(0);
        expect(b.rect.x).toBe(20);
        
        expect(a.rect.width).toBe(20);
        expect(b.rect.width).toBe(20);

        // third item starts a new row
        expect(c.rect.x).toBe(0);
    });
    it('creates a new row after reaching column limit', () => {
        const grid = new Grid(
            { width: 40, height: 20 },
            { columns: 2, gap: 0 }
        );

        const a = new Box();
        const b = new Box();
        const c = new Box();
        const d = new Box();

        grid.addChild(a);
        grid.addChild(b);
        grid.addChild(c);
        grid.addChild(d);

        const node = grid.getLayoutNode();
        computeLayout(node, 40, 20);
        grid.syncLayout();

        expect(grid.children.length).toBe(2);

        expect(a.rect.x).toBe(0);
        expect(b.rect.x).toBe(20);
        
        expect(c.rect.x).toBe(0);
        expect(d.rect.x).toBe(20);
    });

    it('addItem behaves the same as addChild', () => {
        const grid = new Grid(
            { width: 40, height: 20 },
            { columns: 2 }
        );

        const item = new Box();

        grid.addItem(item);

        expect(grid.children.length).toBe(1);
    });

    it('clearItems removes all rows and items', () => {
        const grid = new Grid(
            { width: 40, height: 20 },
            { columns: 2 }
        );

        grid.addChild(new Box());
        grid.addChild(new Box());

        grid.clearItems();

        expect(grid.children.length).toBe(0);
    });
});