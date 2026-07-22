import { describe, it, expect } from 'vitest';
import { toWidget, row, col, grid, stack, spacer } from './layout.js';
import { Widget, Text, Box } from '@termuijs/widgets';

describe('quick layout helpers', () => {
    describe('toWidget', () => {
        it('should pass through existing Widget instances', () => {
            const w = new Box();
            expect(toWidget(w)).toBe(w);
        });

        it('should wrap strings in Text widgets with styles', () => {
            const textWidget = toWidget('hello', { fg: { type: 'named', name: 'red' } });
            expect(textWidget).toBeInstanceOf(Text);
            expect((textWidget as Text).style.fg).toEqual({ type: 'named', name: 'red' });
        });

        it('should wrap reactive functions in Text widgets', () => {
            const reactiveFn = () => 'dynamic';
            const textWidget = toWidget(reactiveFn);
            expect(textWidget).toBeInstanceOf(Text);
        });
    });

    describe('row', () => {
        it('should create a row Box with flexGrow when children have dynamic height', () => {
            const child1 = new Text('1');
            const r = row(child1, 'child2');
            expect(r).toBeInstanceOf(Box);
            expect((r as Box).style.flexDirection).toBe('row');
            expect((r as Box).style.flexGrow).toBe(1);
            expect((r as Box).style.height).toBeUndefined();
        });

        it('should create a row Box with fixed height when all children have fixed height', () => {
            const child1 = new Text('1', { height: 3 });
            const child2 = new Text('2', { height: 5 });
            const r = row(child1, child2);
            expect((r as Box).style.height).toBe(5);
            expect((r as Box).style.flexGrow).toBe(0);
        });

        it('preserves explicit flexGrow on children', () => {
            const child1 = new Box();
            const child2 = new Box({ flexGrow: 2 });
            row(child1, child2);

            expect(child1.style.flexGrow).toBe(1);
            expect(child2.style.flexGrow).toBe(2); // Preserves explicit flexGrow
        });
    });

    describe('col', () => {
        it('should create a column Box with flexGrow', () => {
            const c = col('child1', 'child2');
            expect(c).toBeInstanceOf(Box);
            expect((c as Box).style.flexDirection).toBe('column');
            expect((c as Box).style.flexGrow).toBe(1);
        });
    });

    describe('grid', () => {
        it('should create a column Box containing row Boxes representing the grid', () => {
            const g = grid(2, 3, ['1', '2', '3', '4']);
            expect(g).toBeInstanceOf(Box);
            expect((g as Box).style.flexDirection).toBe('column');
            
            const rows = g.children;
            expect(rows).toHaveLength(2);
            expect(rows[0]).toBeInstanceOf(Box);
            expect(rows[0].style.flexDirection).toBe('row');
            expect((rows[0] as Box).children).toHaveLength(3);
            expect(rows[1]).toBeInstanceOf(Box);
            expect((rows[1] as Box).children).toHaveLength(1);
        });
    });

    describe('stack', () => {
        it('should create a column Box without flexGrow', () => {
            const s = stack('child1', 'child2');
            expect(s).toBeInstanceOf(Box);
            expect((s as Box).style.flexDirection).toBe('column');
            expect((s as Box).style.flexGrow).toBe(0);
        });
    });

    describe('spacer', () => {
        it('should return a Box with flexGrow when size is not specified', () => {
            const s = spacer();
            expect(s.style.flexGrow).toBe(1);
            expect(s.style.height).toBeUndefined();
        });

        it('should return a Box with fixed height when size is specified', () => {
            const s = spacer(4);
            expect(s.style.height).toBe(4);
            expect(s.style.flexGrow).toBe(0);
        });
    });
});
