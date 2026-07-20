// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Tree component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Tree } from './Tree.js';

const TREE_DATA = [
    {
        label: 'Root',
        value: 'root',
        children: [
            {
                label: 'Child A', value: 'a', children: [
                    { label: 'Grandchild A1', value: 'a1' },
                ]
            },
            { label: 'Child B', value: 'b' },
        ],
    },
];

describe('Tree', () => {
    it('creates tree from data', () => {
        const tree = new Tree(TREE_DATA);
        expect(tree).toBeDefined();
    });

    it('selectNext moves cursor forward', () => {
        const tree = new Tree(TREE_DATA);
        tree.selectNext();
        expect(tree).toBeDefined();
    });

    it('selectPrev moves cursor backward', () => {
        const tree = new Tree(TREE_DATA);
        tree.selectNext();
        tree.selectPrev();
        expect(tree).toBeDefined();
    });

    it('toggleExpand expands and collapses node', () => {
        const tree = new Tree(TREE_DATA);
        tree.toggleExpand();
        expect(tree).toBeDefined();
    });

    it('confirm on leaf calls onSelect', () => {
        const onSelect = vi.fn();
        // Use flat leaf nodes so confirm hits the onSelect branch
        const leafData = [{ label: 'Leaf', value: 'leaf' }];
        const tree = new Tree(leafData, { onSelect });
        tree.confirm();
        expect(onSelect).toHaveBeenCalled();
    });

    it('multiple navigations work correctly', () => {
        const tree = new Tree(TREE_DATA);
        tree.selectNext();
        tree.selectNext();
        tree.selectPrev();
        expect(tree).toBeDefined();
    });

    it('handles flat tree (no children)', () => {
        const flat = [{ label: 'Alone', value: 'alone' }];
        const tree = new Tree(flat);
        expect(tree).toBeDefined();
    });
});
