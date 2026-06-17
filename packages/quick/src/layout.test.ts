import { describe, it, expect } from 'vitest';
import { Box, Text, Widget } from '@termuijs/widgets';
import { toWidget, row, col, grid, stack, spacer } from './layout.js';

describe('quick layout helpers', () => {
    describe('toWidget', () => {
        it('passes through Widget instances directly', () => {
            const w = new Box();
            expect(toWidget(w)).toBe(w);
        });

        it('wraps string child in Text widget with default height 1', () => {
            const result = toWidget('hello world');
            expect(result).toBeInstanceOf(Text);
            expect(result.style.height).toBe(1);
            // Verify content
            expect(result.getContent()).toBe('hello world');
        });

        it('wraps reactive function in dynamic Text widget', () => {
            let reactiveValue = 'initial';
            const reactiveFn = () => reactiveValue;
            
            const result = toWidget(reactiveFn);
            expect(result).toBeInstanceOf(Text);
            expect(result.style.height).toBe(1);
            expect(result.getContent()).toBe('initial');
        });
    });

    describe('row', () => {
        it('creates a Box container with row flexDirection and a default gap', () => {
            const r = row('col1', 'col2');
            expect(r).toBeInstanceOf(Box);
            expect(r.style.flexDirection).toBe('row');
            expect(r.style.gap).toBe(1);
            expect((r as any).children).toHaveLength(2);
        });

        it('assigns flexGrow to children lacking explicit flexGrow', () => {
            const child1 = new Box();
            const child2 = new Box({ flexGrow: 2 });
            const r = row(child1, child2);
            
            expect(child1.style.flexGrow).toBe(1);
            expect(child2.style.flexGrow).toBe(2); // Preserves explicit flexGrow
        });

        it('infers row height if all children have a fixed height', () => {
            const child1 = new Text('a', { height: 3 });
            const child2 = new Text('b', { height: 5 });
            const r = row(child1, child2);
            
            expect(r.style.height).toBe(5);
            expect(r.style.flexGrow).toBe(0);
        });

        it('applies flexGrow to the row container if any child is flexible height', () => {
            const child1 = new Text('a', { height: 3 });
            const child2 = new Box(); // flexGrow by default, height undefined
            const r = row(child1, child2);
            
            expect(r.style.height).toBeUndefined();
            expect(r.style.flexGrow).toBe(1);
        });
    });

    describe('col', () => {
        it('creates a vertical Box container with flexGrow 1', () => {
            const c = col('item1', 'item2');
            expect(c).toBeInstanceOf(Box);
            expect(c.style.flexDirection).toBe('column');
            expect(c.style.flexGrow).toBe(1);
            expect((c as any).children).toHaveLength(2);
        });
    });

    describe('grid', () => {
        it('creates a column Box container containing rows × cols grid structure', () => {
            const g = grid(2, 3, ['a', 'b', 'c', 'd', 'e']);
            expect(g).toBeInstanceOf(Box);
            expect(g.style.flexDirection).toBe('column');
            
            const rows = (g as any).children;
            expect(rows).toHaveLength(2);
            
            // First row should have 3 items
            expect(rows[0]).toBeInstanceOf(Box);
            expect(rows[0].style.flexDirection).toBe('row');
            expect((rows[0] as any).children).toHaveLength(3);
            
            // Second row should have remaining 2 items
            expect(rows[1]).toBeInstanceOf(Box);
            expect(rows[1].style.flexDirection).toBe('row');
            expect((rows[1] as any).children).toHaveLength(2);
        });
    });

    describe('stack', () => {
        it('creates a vertical Box container without flexGrow', () => {
            const s = stack('first', 'second');
            expect(s).toBeInstanceOf(Box);
            expect(s.style.flexDirection).toBe('column');
            expect(s.style.flexGrow).toBe(0);
            expect((s as any).children).toHaveLength(2);
        });
    });

    describe('spacer', () => {
        it('creates a growing spacer Box by default', () => {
            const s = spacer();
            expect(s).toBeInstanceOf(Box);
            expect(s.style.flexGrow).toBe(1);
            expect(s.style.height).toBeUndefined();
        });

        it('creates a fixed size spacer Box if size is specified', () => {
            const s = spacer(4);
            expect(s).toBeInstanceOf(Box);
            expect(s.style.height).toBe(4);
            expect(s.style.flexGrow).toBe(0);
        });
    });
});
