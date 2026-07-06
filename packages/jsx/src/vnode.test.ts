import { describe, it, expect } from 'vitest';
import { isVElement, isVFragment, flattenChildren, Fragment } from './vnode.js';

describe('vnode helpers', () => {
    describe('isVElement', () => {
        it('returns true for a valid VElement object', () => {
            const validElement = {
                type: 'box',
                props: {},
                children: []
            };
            expect(isVElement(validElement)).toBe(true);
        });

        it('returns false for primitive values, null, and undefined', () => {
            expect(isVElement(null)).toBe(false);
            expect(isVElement(undefined)).toBe(false);
            expect(isVElement('hello')).toBe(false);
            expect(isVElement(123)).toBe(false);
            expect(isVElement(true)).toBe(false);
        });

        it('returns false for objects missing type or props', () => {
            expect(isVElement({ type: 'box' })).toBe(false);
            expect(isVElement({ props: {} })).toBe(false);
        });
    });

    describe('isVFragment', () => {
        it('returns true for a valid VFragment', () => {
            const validFragment = {
                type: Fragment,
                children: []
            };
            expect(isVFragment(validFragment)).toBe(true);
        });

        it('returns false for standard VElement, primitives, null, or undefined', () => {
            const standardElement = {
                type: 'box',
                props: {},
                children: []
            };
            expect(isVFragment(standardElement)).toBe(false);
            expect(isVFragment(null)).toBe(false);
            expect(isVFragment(undefined)).toBe(false);
            expect(isVFragment('fragment')).toBe(false);
        });
    });

    describe('flattenChildren', () => {
        it('filters out null, undefined, and booleans', () => {
            const input = ['hello', null, undefined, true, false, 'world'];
            expect(flattenChildren(input)).toEqual(['hello', 'world']);
        });

        it('recursively flattens nested arrays of children', () => {
            const input = ['a', ['b', ['c', 'd']], 'e'];
            expect(flattenChildren(input)).toEqual(['a', 'b', 'c', 'd', 'e']);
        });

        it('preserves primitive values like numbers', () => {
            const input = [1, [2, 3], 4];
            expect(flattenChildren(input)).toEqual([1, 2, 3, 4]);
        });
    });
});
