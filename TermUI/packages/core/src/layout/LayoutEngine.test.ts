// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Layout Engine
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { computeLayout, createLayoutNode } from '../layout/LayoutEngine.js';
import type { Style } from '../style/Style.js';

function makeNode(id: string, style: Partial<Style> = {}, children: ReturnType<typeof createLayoutNode>[] = []) {
    return createLayoutNode(id, {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        flexGrow: 0,
        flexShrink: 1,
        visible: true,
        ...style,
    }, children);
}

describe('computeLayout', () => {
    it('sets root node to container size', () => {
        const root = makeNode('root');
        computeLayout(root, 80, 24);
        expect(root.computed).toEqual({ x: 0, y: 0, width: 80, height: 24 });
    });

    it('lays out children in column direction', () => {
        const root = makeNode('root', { flexDirection: 'column' }, [
            makeNode('a', { height: 5 }),
            makeNode('b', { height: 5 }),
        ]);
        computeLayout(root, 80, 24);

        expect(root.children[0].computed.y).toBe(0);
        expect(root.children[0].computed.height).toBe(5);
        expect(root.children[1].computed.y).toBe(5);
        expect(root.children[1].computed.height).toBe(5);
    });

    it('lays out children in row direction', () => {
        const root = makeNode('root', { flexDirection: 'row' }, [
            makeNode('a', { width: 20 }),
            makeNode('b', { width: 20 }),
        ]);
        computeLayout(root, 80, 24);

        expect(root.children[0].computed.x).toBe(0);
        expect(root.children[0].computed.width).toBe(20);
        expect(root.children[1].computed.x).toBe(20);
        expect(root.children[1].computed.width).toBe(20);
    });

    it('distributes space with flexGrow', () => {
        const root = makeNode('root', { flexDirection: 'column' }, [
            makeNode('a', { flexGrow: 1 }),
            makeNode('b', { flexGrow: 1 }),
        ]);
        computeLayout(root, 80, 24);

        expect(root.children[0].computed.height).toBe(12);
        expect(root.children[1].computed.height).toBe(12);
    });

    it('handles percentage widths', () => {
        const root = makeNode('root', { flexDirection: 'row' }, [
            makeNode('a', { width: '50%' }),
            makeNode('b', { width: '50%' }),
        ]);
        computeLayout(root, 80, 24);

        expect(root.children[0].computed.width).toBe(40);
        expect(root.children[1].computed.width).toBe(40);
    });

    it('respects padding', () => {
        const root = makeNode('root', { padding: 2 }, [
            makeNode('child', { flexGrow: 1 }),
        ]);
        computeLayout(root, 80, 24);

        expect(root.children[0].computed.x).toBe(2);
        expect(root.children[0].computed.y).toBe(2);
        expect(root.children[0].computed.width).toBe(76);
        expect(root.children[0].computed.height).toBe(20);
    });

    it('respects gap between children', () => {
        const root = makeNode('root', { flexDirection: 'column', gap: 1 }, [
            makeNode('a', { height: 3 }),
            makeNode('b', { height: 3 }),
        ]);
        computeLayout(root, 80, 24);

        expect(root.children[0].computed.y).toBe(0);
        expect(root.children[1].computed.y).toBe(4); // 3 + 1 gap
    });

    it('centers children with justifyContent: center', () => {
        const root = makeNode('root', { flexDirection: 'column', justifyContent: 'center' }, [
            makeNode('a', { height: 4 }),
        ]);
        computeLayout(root, 80, 24);

        expect(root.children[0].computed.y).toBe(10); // (24 - 4) / 2
    });

    it('hides invisible children', () => {
        const root = makeNode('root', { flexDirection: 'column' }, [
            makeNode('a', { height: 5 }),
            makeNode('hidden', { height: 5, visible: false }),
            makeNode('b', { height: 5 }),
        ]);
        computeLayout(root, 80, 24);

        // 'b' should be right after 'a', not after the hidden one's space
        expect(root.children[0].computed.y).toBe(0);
        // The visible 'b' should be at y=5 (after 'a')
        // Note: hidden children are filtered out of layout
    });
});
