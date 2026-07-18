import { describe, it, expect } from 'vitest';
import { setIn, updateIn, deleteIn } from './immutable.js';

describe('immutable helpers', () => {
    describe('setIn', () => {
        it('sets a value at a simple path', () => {
            const original = { a: 1, b: 2 };
            const updated = setIn(original, ['a'], 10);

            expect(updated).toEqual({ a: 10, b: 2 });
            expect(original).toEqual({ a: 1, b: 2 }); // should not mutate
        });

        it('sets a value at a deeply nested path', () => {
            const original = { a: { b: { c: 3 } }, d: 4 };
            const updated = setIn(original, ['a', 'b', 'c'], 30);

            expect(updated).toEqual({ a: { b: { c: 30 } }, d: 4 });
            expect(original).toEqual({ a: { b: { c: 3 } }, d: 4 }); // should not mutate
        });

        it('uses structural sharing', () => {
            const childB = { c: 3 };
            const original = { a: childB, d: { e: 5 } };
            const updated = setIn(original, ['d', 'e'], 50);

            expect(updated.a).toBe(original.a); // unchanged branch must be reference-equal
            expect(updated.d).not.toBe(original.d); // changed branch must be new reference
        });

        it('creates intermediate objects/arrays if they do not exist', () => {
            const original = {};
            const updated = setIn(original, ['a', 0, 'b'], 'value');

            expect(updated).toEqual({ a: [{ b: 'value' }] });
            expect(Array.isArray((updated as any).a)).toBe(true);
        });

        it('works with array updates', () => {
            const original = { list: [1, 2, 3] };
            const updated = setIn(original, ['list', 1], 20);

            expect(updated).toEqual({ list: [1, 20, 3] });
            expect(original.list).toEqual([1, 2, 3]); // should not mutate
        });
    });

    describe('updateIn', () => {
        it('updates a value at a simple path using an updater function', () => {
            const original = { a: 5 };
            const updated = updateIn(original, ['a'], (val) => val * 2);

            expect(updated).toEqual({ a: 10 });
        });

        it('updates a value at a deeply nested path', () => {
            const original = { a: { b: { count: 10 } } };
            const updated = updateIn(original, ['a', 'b', 'count'], (c) => c + 1);

            expect(updated).toEqual({ a: { b: { count: 11 } } });
        });

        it('creates intermediate values with undefined passed to updater', () => {
            const original = {};
            const updated = updateIn(original, ['a', 'b'], (val) => (val === undefined ? 'default' : val));

            expect(updated).toEqual({ a: { b: 'default' } });
        });
    });

    describe('deleteIn', () => {
        it('deletes a key from a nested object', () => {
            const original = { a: { b: 2, c: 3 }, d: 4 };
            const updated = deleteIn(original, ['a', 'b']);

            expect(updated).toEqual({ a: { c: 3 }, d: 4 });
            expect(original).toEqual({ a: { b: 2, c: 3 }, d: 4 }); // should not mutate
        });

        it('splicies an element from an array', () => {
            const original = { list: [10, 20, 30] };
            const updated = deleteIn(original, ['list', 1]);

            expect(updated).toEqual({ list: [10, 30] });
        });

        it('returns original if deleting a non-existent path', () => {
            const original = { a: 1 };
            const updated1 = deleteIn(original, ['b']);
            const updated2 = deleteIn(original, ['a', 'b']);

            expect(updated1).toBe(original);
            expect(updated2).toBe(original);
        });

        it('returns original if deleting from a primitive', () => {
            const original = 42;
            const updated = deleteIn(original, ['a']);
            expect(updated).toBe(original);
        });
    });
});
