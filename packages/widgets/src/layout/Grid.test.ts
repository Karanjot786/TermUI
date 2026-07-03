// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for CSS Grid layout
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Grid, GridItem } from './Grid.js';
import { Box } from '../display/Box.js';
import { computeLayout } from '@termuijs/core';

describe('Grid layout', () => {
    it('places children into columns and rows (auto-placement)', () => {
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

        // 4 children directly under the grid
        expect(grid.children.length).toBe(4);

        // Row 1 (y = 0), each takes half width (20 cells)
        expect(a.rect.x).toBe(0);
        expect(a.rect.y).toBe(0);
        expect(a.rect.width).toBe(20);
        expect(a.rect.height).toBe(10); // Auto-row height: remaining / 2 rows = 10

        expect(b.rect.x).toBe(20);
        expect(b.rect.y).toBe(0);
        expect(b.rect.width).toBe(20);
        expect(b.rect.height).toBe(10);

        // Row 2 (y = 10)
        expect(c.rect.x).toBe(0);
        expect(c.rect.y).toBe(10);
        expect(c.rect.width).toBe(20);
        expect(c.rect.height).toBe(10);

        expect(d.rect.x).toBe(20);
        expect(d.rect.y).toBe(10);
        expect(d.rect.width).toBe(20);
        expect(d.rect.height).toBe(10);
    });

    it('applies grid gaps correctly', () => {
        const grid = new Grid(
            { width: 41, height: 21 },
            { columns: 2, gap: 1 }
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
        computeLayout(node, 41, 21);
        grid.syncLayout();

        // Width 41, gap 1 -> columns get (41 - 1)/2 = 20 width each.
        // Height 21, gap 1 -> rows get (21 - 1)/2 = 10 height each.
        expect(a.rect.x).toBe(0);
        expect(a.rect.width).toBe(20);
        expect(a.rect.height).toBe(10);

        expect(b.rect.x).toBe(21); // 20 + gap 1
        expect(b.rect.width).toBe(20);

        expect(c.rect.y).toBe(11); // 10 + gap 1
        expect(c.rect.height).toBe(10);
    });

    it('supports track sizing using px, fr, and %', () => {
        const grid = new Grid(
            { width: 50, height: 20 },
            { columns: '10px 2fr 30%', gap: 0 }
        );

        const a = new Box();
        const b = new Box();
        const c = new Box();

        grid.addChild(a);
        grid.addChild(b);
        grid.addChild(c);

        const node = grid.getLayoutNode();
        computeLayout(node, 50, 20);
        grid.syncLayout();

        // Column 1: 10px -> 10 cells
        // Column 3: 30% of 50 -> 15 cells
        // Column 2: 2fr -> takes remaining 25 cells (since total width is 50, 50 - 10 - 15 = 25)
        expect(a.rect.width).toBe(10);
        expect(b.rect.width).toBe(25);
        expect(c.rect.width).toBe(15);

        expect(a.rect.x).toBe(0);
        expect(b.rect.x).toBe(10);
        expect(c.rect.x).toBe(35);
    });

    it('supports column and row spans using GridItem', () => {
        const grid = new Grid(
            { width: 40, height: 20 },
            { columns: '1fr 1fr', gap: 0 }
        );

        // GridItem spanning 2 columns
        const a = new GridItem({}, { columnStart: 'span 2' });
        const b = new Box();
        const c = new Box();

        grid.addChild(a);
        grid.addChild(b);
        grid.addChild(c);

        const node = grid.getLayoutNode();
        computeLayout(node, 40, 20);
        grid.syncLayout();

        // a spans 2 columns, so it takes full width of the first row
        expect(a.rect.x).toBe(0);
        expect(a.rect.y).toBe(0);
        expect(a.rect.width).toBe(40);

        // b and c are placed in the second row
        expect(b.rect.x).toBe(0);
        expect(b.rect.y).toBe(10);
        expect(b.rect.width).toBe(20);

        expect(c.rect.x).toBe(20);
        expect(c.rect.y).toBe(10);
        expect(c.rect.width).toBe(20);
    });

    it('respects child margins in layout cells', () => {
        const grid = new Grid(
            { width: 40, height: 20 },
            { columns: 2, gap: 0 }
        );

        const a = new Box({ margin: 2 });
        grid.addChild(a);

        const node = grid.getLayoutNode();
        computeLayout(node, 40, 20);
        grid.syncLayout();

        // a's grid cell is x: 0..20, y: 0..20. Margin is 2 all around.
        expect(a.rect.x).toBe(2);
        expect(a.rect.y).toBe(2);
        expect(a.rect.width).toBe(16); // 20 - 2 (left) - 2 (right)
        expect(a.rect.height).toBe(16); // 20 - 2 (top) - 2 (bottom)
    });

    it('addItem behaves the same as addChild and clearItems clears them', () => {
        const grid = new Grid(
            { width: 40, height: 20 },
            { columns: 2 }
        );

        const item = new Box();
        grid.addItem(item);
        expect(grid.children.length).toBe(1);

        grid.clearItems();
        expect(grid.children.length).toBe(0);
    });
});