// Tests — JSX Factory (createElement / jsx / jsxs)

import { describe, it, expect } from 'vitest';
import { createElement, jsx, jsxs } from './createElement.js';
import { Fragment, type VElement } from './vnode.js';

describe('createElement', () => {
    it('creates a basic virtual element', () => {
        const node = createElement('Box', { gap: 1 }, 'hello');
        expect(node).toEqual({
            type: 'Box',
            props: { gap: 1 },
            children: ['hello'],
            key: undefined,
        });
    });

    it('extracts key from props and deletes it from resolved props', () => {
        const node = createElement('Box', { gap: 1, key: 'my-key' }, 'hello');
        expect(node).toEqual({
            type: 'Box',
            props: { gap: 1 },
            children: ['hello'],
            key: 'my-key',
        });
    });

    it('supports numeric keys', () => {
        const node = createElement('Box', { key: 42 }) as VElement; // cast to assert on VElement properties
        expect(node.key).toBe(42);
    });

    it('handles null and undefined props gracefully', () => {
        const nodeNull = createElement('Box', null, 'hello');
        expect(nodeNull).toEqual({
            type: 'Box',
            props: {},
            children: ['hello'],
            key: undefined,
        });

        const nodeUndefined = createElement('Box', undefined as any, 'hello'); // cast to any to test runtime undefined props handling
        expect(nodeUndefined).toEqual({
            type: 'Box',
            props: {},
            children: ['hello'],
            key: undefined,
        });
    });

    it('flattens children arrays, filtering out booleans and null/undefined values', () => {
        const node = createElement(
            'Box',
            null,
            'a',
            null,
            false,
            true,
            ['b', ['c', undefined, 'd']],
            'e'
        ) as VElement; // cast to assert on VElement properties
        expect(node.children).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('returns a VFragment when type is Fragment', () => {
        const node = createElement(Fragment, null, 'hello', 'world');
        expect(node).toEqual({
            type: Fragment,
            children: ['hello', 'world'],
        });
    });

    it('supports functional components', () => {
        const MyComponent = (props: { label: string }) => createElement('Box', props);
        const node = createElement(MyComponent, { label: 'test' }, 'child');
        expect(node).toEqual({
            type: MyComponent,
            props: { label: 'test' },
            children: ['child'],
            key: undefined,
        });
    });
});

describe('jsx / jsxs', () => {
    it('creates a virtual element without children', () => {
        const node = jsx('Box', { gap: 1 }, 'key1');
        expect(node).toEqual({
            type: 'Box',
            props: { gap: 1 },
            children: [],
            key: 'key1',
        });
    });

    it('creates a virtual element with a single child', () => {
        const node = jsx('Box', { gap: 1, children: 'hello' }, 'key2');
        expect(node).toEqual({
            type: 'Box',
            props: { gap: 1 },
            children: ['hello'],
            key: 'key2',
        });
    });

    it('creates a virtual element with an array of children', () => {
        const node = jsx('Box', { gap: 1, children: ['hello', 'world'] }, 'key3');
        expect(node).toEqual({
            type: 'Box',
            props: { gap: 1 },
            children: ['hello', 'world'],
            key: 'key3',
        });
    });

    it('returns a VFragment when type is Fragment', () => {
        const node = jsx(Fragment, { children: ['hello', 'world'] });
        expect(node).toEqual({
            type: Fragment,
            children: ['hello', 'world'],
        });
    });

    it('jsxs is an alias to jsx', () => {
        expect(jsxs).toBe(jsx);
    });
});
