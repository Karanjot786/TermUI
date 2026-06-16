import { describe, it, expect, beforeEach } from 'vitest';
import { WidgetTreeInspector } from './inspector.js';
import type { WidgetNode } from './devtools.js';

/** Helper: build a WidgetNode for testing. */
function makeNode(
    type: string,
    children: WidgetNode[] = [],
    id?: string,
): WidgetNode {
    return {
        type,
        id,
        rect: { x: 0, y: 0, width: 40, height: 10 },
        children,
    };
}

describe('WidgetTreeInspector', () => {
    let inspector: WidgetTreeInspector;

    beforeEach(() => {
        inspector = new WidgetTreeInspector();
    });

    // ── Visibility ───────────────────────────────────

    describe('visibility', () => {
        it('starts hidden', () => {
            expect(inspector.visible).toBe(false);
        });

        it('toggle flips visibility', () => {
            inspector.toggle();
            expect(inspector.visible).toBe(true);
            inspector.toggle();
            expect(inspector.visible).toBe(false);
        });

        it('show() and hide() set visibility explicitly', () => {
            inspector.show();
            expect(inspector.visible).toBe(true);
            inspector.hide();
            expect(inspector.visible).toBe(false);
        });
    });

    // ── Tree serialization ───────────────────────────

    describe('getLines', () => {
        it('returns "no data" when no tree is set', () => {
            const lines = inspector.getLines(10);
            expect(lines).toEqual(['  No widget tree data']);
        });

        it('returns "no data" after updateTree(null)', () => {
            inspector.updateTree(makeNode('Box'));
            inspector.updateTree(null);
            const lines = inspector.getLines(10);
            expect(lines).toEqual(['  No widget tree data']);
        });

        it('renders a single root node', () => {
            inspector.updateTree(makeNode('Box', [], 'root'));
            const lines = inspector.getLines(10);
            expect(lines.length).toBe(1);
            expect(lines[0]).toContain('Box#root');
            expect(lines[0]).toContain('(0,0 40x10)');
        });

        it('renders a nested tree with indentation', () => {
            const tree = makeNode('Box', [
                makeNode('Text', [], 'title'),
                makeNode('Text', [], 'body'),
            ], 'root');
            inspector.updateTree(tree);
            const lines = inspector.getLines(10);

            expect(lines.length).toBe(3);
            expect(lines[0]).toContain('Box#root');
            expect(lines[1]).toContain('Text#title');
            expect(lines[2]).toContain('Text#body');
        });

        it('respects maxLines limit', () => {
            const tree = makeNode('Box', [
                makeNode('A'),
                makeNode('B'),
                makeNode('C'),
            ]);
            inspector.updateTree(tree);
            const lines = inspector.getLines(2);
            expect(lines.length).toBe(2);
        });
    });

    // ── Selection ────────────────────────────────────

    describe('selection', () => {
        it('starts at index 0', () => {
            expect(inspector.selectedIndex).toBe(0);
        });

        it('selectNext moves selection down', () => {
            inspector.updateTree(makeNode('Box', [makeNode('Text')]));
            inspector.selectNext();
            expect(inspector.selectedIndex).toBe(1);
        });

        it('selectNext clamps at the last node', () => {
            inspector.updateTree(makeNode('Box'));
            inspector.selectNext();
            inspector.selectNext();
            expect(inspector.selectedIndex).toBe(0);
        });

        it('selectPrev moves selection up', () => {
            inspector.updateTree(makeNode('Box', [makeNode('Text')]));
            inspector.selectNext();
            inspector.selectPrev();
            expect(inspector.selectedIndex).toBe(0);
        });

        it('selectPrev clamps at 0', () => {
            inspector.updateTree(makeNode('Box', [makeNode('Text')]));
            inspector.selectPrev();
            expect(inspector.selectedIndex).toBe(0);
        });

        it('getSelectedNode returns the correct node', () => {
            const child = makeNode('Text', [], 'child');
            const tree = makeNode('Box', [child], 'root');
            inspector.updateTree(tree);
            expect(inspector.getSelectedNode()?.id).toBe('root');
            inspector.selectNext();
            expect(inspector.getSelectedNode()?.id).toBe('child');
        });

        it('getSelectedNode returns null when no tree', () => {
            expect(inspector.getSelectedNode()).toBeNull();
        });

        it('marks the selected line with > prefix', () => {
            inspector.updateTree(makeNode('Box', [makeNode('Text')]));
            const lines = inspector.getLines(10);
            expect(lines[0].startsWith('>')).toBe(true);
            expect(lines[1].startsWith(' ')).toBe(true);
        });
    });

    // ── Expand / Collapse ────────────────────────────

    describe('expand/collapse', () => {
        it('toggleExpand collapses a node with children', () => {
            inspector.updateTree(makeNode('Box', [
                makeNode('Text', [], 'a'),
                makeNode('Text', [], 'b'),
            ], 'root'));

            expect(inspector.getLines(10).length).toBe(3);

            inspector.toggleExpand();
            const lines = inspector.getLines(10);
            expect(lines.length).toBe(1);
            expect(lines[0]).toContain('\u25b8'); // ▸
        });

        it('toggleExpand re-expands a collapsed node', () => {
            inspector.updateTree(makeNode('Box', [makeNode('Text')], 'root'));

            inspector.toggleExpand();
            expect(inspector.getLines(10).length).toBe(1);
            inspector.toggleExpand();
            expect(inspector.getLines(10).length).toBe(2);
        });

        it('toggleExpand does nothing on a leaf node', () => {
            inspector.updateTree(makeNode('Text', [], 'leaf'));
            inspector.toggleExpand();
            expect(inspector.getLines(10).length).toBe(1);
        });

        it('expandAll expands all nodes', () => {
            inspector.updateTree(makeNode('Box', [
                makeNode('Inner', [makeNode('Text')]),
            ]));
            inspector.collapseAll();
            expect(inspector.getLines(10).length).toBe(1);

            inspector.expandAll();
            expect(inspector.getLines(10).length).toBe(3);
        });

        it('collapseAll collapses all nodes with children', () => {
            inspector.updateTree(makeNode('Box', [
                makeNode('Inner', [makeNode('Text')]),
            ]));
            inspector.collapseAll();

            const lines = inspector.getLines(10);
            expect(lines.length).toBe(1);
            expect(lines[0]).toContain('\u25b8'); // ▸
        });

        it('selection clamps when tree shrinks after collapse', () => {
            inspector.updateTree(makeNode('Box', [
                makeNode('A'),
                makeNode('B'),
            ]));
            inspector.selectNext();
            inspector.selectNext();
            expect(inspector.selectedIndex).toBe(2);

            inspector.selectPrev();
            inspector.selectPrev();
            inspector.toggleExpand();
            expect(inspector.selectedIndex).toBe(0);
        });
    });

    // ── Node count ───────────────────────────────────

    describe('nodeCount', () => {
        it('returns 0 for no tree', () => {
            expect(inspector.nodeCount).toBe(0);
        });

        it('returns 0 after updateTree(null)', () => {
            inspector.updateTree(makeNode('Box'));
            inspector.updateTree(null);
            expect(inspector.nodeCount).toBe(0);
        });

        it('counts all nodes including collapsed subtrees', () => {
            inspector.updateTree(makeNode('Box', [
                makeNode('A', [makeNode('B')]),
                makeNode('C'),
            ]));
            inspector.collapseAll();
            expect(inspector.nodeCount).toBe(4);
        });
    });

    // ── 1. Selection reset when tree is cleared ───────

    describe('selection reset on updateTree(null)', () => {
        it('selectedIndex stays at 0 after clearing a tree with a selection', () => {
            inspector.updateTree(makeNode('Box', [makeNode('A'), makeNode('B')]));
            inspector.selectNext();
            inspector.selectNext();
            expect(inspector.selectedIndex).toBe(2);

            inspector.updateTree(null);
            expect(inspector.selectedIndex).toBe(0);
        });

        it('getSelectedNode() returns null after clearing', () => {
            inspector.updateTree(makeNode('Box', [makeNode('Text')]));
            inspector.selectNext();
            inspector.updateTree(null);
            expect(inspector.getSelectedNode()).toBeNull();
        });

        it('does not throw when clearing a tree with a deep selection', () => {
            inspector.updateTree(makeNode('Box', [
                makeNode('A'),
                makeNode('B'),
                makeNode('C'),
            ]));
            for (let i = 0; i < 10; i++) inspector.selectNext();
            expect(() => inspector.updateTree(null)).not.toThrow();
            expect(inspector.selectedIndex).toBe(0);
        });
    });

    // ── 2. Selection clamps after tree replacement ────

    describe('selection clamping after tree replacement', () => {
        it('clamps selectedIndex when replacement tree is smaller', () => {
            // Build a 5-node tree and move to the last entry
            inspector.updateTree(makeNode('Root', [
                makeNode('A'),
                makeNode('B'),
                makeNode('C'),
                makeNode('D'),
            ]));
            for (let i = 0; i < 4; i++) inspector.selectNext();
            expect(inspector.selectedIndex).toBe(4);

            // Replace with a 2-node tree
            inspector.updateTree(makeNode('Root', [makeNode('X')]));
            expect(inspector.selectedIndex).toBeLessThan(2);
            expect(inspector.selectedIndex).toBeGreaterThanOrEqual(0);
        });

        it('selected node is valid after replacement', () => {
            inspector.updateTree(makeNode('Big', [
                makeNode('A'),
                makeNode('B'),
                makeNode('C'),
            ]));
            for (let i = 0; i < 3; i++) inspector.selectNext();

            inspector.updateTree(makeNode('Small', [makeNode('Only')]));
            const node = inspector.getSelectedNode();
            expect(node).not.toBeNull();
        });

        it('no out-of-bounds access when replacing tree with single-node tree', () => {
            inspector.updateTree(makeNode('Root', [
                makeNode('A'),
                makeNode('B'),
                makeNode('C'),
                makeNode('D'),
                makeNode('E'),
            ]));
            for (let i = 0; i < 5; i++) inspector.selectNext();

            expect(() => inspector.updateTree(makeNode('Root'))).not.toThrow();
            expect(inspector.selectedIndex).toBe(0);
            expect(inspector.getSelectedNode()?.type).toBe('Root');
        });
    });

    // ── 3. Collapse state persists across tree rebuilds ─

    describe('collapse state persistence across tree rebuilds', () => {
        it('keeps a node collapsed when rebuilt with the same id-based key', () => {
            const buildTree = () => makeNode('Root', [
                makeNode('Panel', [makeNode('Text')], 'panel1'),
            ], 'root');

            inspector.updateTree(buildTree());
            // Collapse Root (index 0)
            inspector.toggleExpand();
            expect(inspector.getLines(10).length).toBe(1);

            // Rebuild with structurally identical tree (same ids)
            inspector.updateTree(buildTree());
            // Root is still collapsed because its key "Root#root" is in the set
            expect(inspector.getLines(10).length).toBe(1);
        });

        it('does not carry stale collapse state across completely different trees', () => {
            inspector.updateTree(makeNode('Box', [makeNode('A')], 'box1'));
            inspector.toggleExpand(); // collapse Box#box1

            // Replace with a tree that has no matching keys
            inspector.updateTree(makeNode('Screen', [makeNode('B')], 'scr1'));
            // 'Box#box1' key is gone; new root should be expanded by default
            expect(inspector.getLines(10).length).toBe(2);
        });
    });

    // ── 4. Deeply nested expand/collapse ─────────────

    describe('deeply nested tree expand/collapse', () => {
        /** Root > A > B > C */
        function makeDeepTree(): WidgetNode {
            return makeNode('Root', [
                makeNode('A', [
                    makeNode('B', [
                        makeNode('C'),
                    ]),
                ]),
            ]);
        }

        it('flattens a 4-level tree into 4 visible entries', () => {
            inspector.updateTree(makeDeepTree());
            expect(inspector.getLines(20).length).toBe(4);
        });

        it('collapsing intermediate node hides its subtree only', () => {
            inspector.updateTree(makeDeepTree());
            // Navigate to A (index 1) and collapse it
            inspector.selectNext();
            inspector.toggleExpand();
            const lines = inspector.getLines(20);
            // Only Root and A should be visible
            expect(lines.length).toBe(2);
            expect(lines[0]).toContain('Root');
            expect(lines[1]).toContain('A');
        });

        it('expanding a collapsed node restores full visibility', () => {
            inspector.updateTree(makeDeepTree());
            inspector.selectNext(); // select A
            inspector.toggleExpand(); // collapse A
            expect(inspector.getLines(20).length).toBe(2);

            inspector.toggleExpand(); // re-expand A
            expect(inspector.getLines(20).length).toBe(4);
        });

        it('collapseAll on deep tree shows only root', () => {
            inspector.updateTree(makeDeepTree());
            inspector.collapseAll();
            const lines = inspector.getLines(20);
            expect(lines.length).toBe(1);
            expect(lines[0]).toContain('Root');
        });

        it('expandAll after full collapse restores all 4 nodes', () => {
            inspector.updateTree(makeDeepTree());
            inspector.collapseAll();
            inspector.expandAll();
            expect(inspector.getLines(20).length).toBe(4);
        });
    });

    // ── 5. Node key stability ─────────────────────────

    describe('node key stability', () => {
        it('id-keyed nodes stay collapsed when the same tree is passed again', () => {
            const tree = makeNode('Root', [makeNode('Child', [], 'c1')], 'r1');
            inspector.updateTree(tree);
            // Nothing to collapse on the leaf, collapse root instead
            inspector.toggleExpand();
            const keyedLines = inspector.getLines(10).length;

            // Pass the exact same tree object again
            inspector.updateTree(tree);
            expect(inspector.getLines(10).length).toBe(keyedLines);
        });

        it('path-keyed nodes (no id) distinguish siblings by position', () => {
            // Two siblings with the same type but no id
            // Flat order (all expanded): 0=Root, 1=Item[0], 2=X, 3=Item[1], 4=Y
            inspector.updateTree(makeNode('Root', [
                makeNode('Item', [makeNode('X')]),
                makeNode('Item', [makeNode('Y')]),
            ]));

            // Navigate to Item[1] (flat index 3) and collapse it
            inspector.selectNext(); // 1=Item[0]
            inspector.selectNext(); // 2=X
            inspector.selectNext(); // 3=Item[1]
            inspector.toggleExpand(); // collapse Item[1] — hides Y

            const lines = inspector.getLines(20);
            // Root, Item[0], X, Item[1] (collapsed — Y hidden) = 4
            expect(lines.length).toBe(4);
        });

        it('generated keys are unique across siblings', () => {
            // Both siblings collapsed separately should each hide 1 child
            inspector.updateTree(makeNode('Root', [
                makeNode('Panel', [makeNode('A')]),
                makeNode('Panel', [makeNode('B')]),
            ]));

            // Collapse first Panel (index 1)
            inspector.selectNext();
            inspector.toggleExpand();
            // Collapse second Panel (index 2, now at flat index 2)
            inspector.selectNext();
            inspector.toggleExpand();

            // Root + 2 collapsed panels = 3 visible lines
            expect(inspector.getLines(20).length).toBe(3);
        });
    });

    // ── 6. getLines() with very small limits ──────────

    describe('getLines with tiny maxLines', () => {
        it('getLines(0) returns an empty array', () => {
            inspector.updateTree(makeNode('Box', [makeNode('A'), makeNode('B')]));
            const lines = inspector.getLines(0);
            expect(lines.length).toBe(0);
        });

        it('getLines(1) returns exactly one line', () => {
            inspector.updateTree(makeNode('Box', [makeNode('A'), makeNode('B')]));
            const lines = inspector.getLines(1);
            expect(lines.length).toBe(1);
        });

        it('getLines(0) does not throw on null tree', () => {
            expect(() => inspector.getLines(0)).not.toThrow();
        });

        it('getLines(1) on null tree returns the "no data" message', () => {
            const lines = inspector.getLines(1);
            expect(lines).toEqual(['  No widget tree data']);
        });
    });

    // ── 7. Empty children arrays ──────────────────────

    describe('nodes with empty children arrays', () => {
        it('a node with children:[] is treated as a leaf', () => {
            inspector.updateTree(makeNode('Leaf', []));
            const lines = inspector.getLines(10);
            expect(lines.length).toBe(1);
            // Leaf nodes have no expand marker (two spaces)
            expect(lines[0]).toContain('  Leaf');
        });

        it('toggleExpand on a node with children:[] does nothing', () => {
            inspector.updateTree(makeNode('Leaf', []));
            inspector.toggleExpand();
            expect(inspector.getLines(10).length).toBe(1);
        });

        it('nodeCount for a leaf is 1', () => {
            inspector.updateTree(makeNode('Solo', []));
            expect(inspector.nodeCount).toBe(1);
        });

        it('mixed tree: leaf siblings do not affect each other', () => {
            inspector.updateTree(makeNode('Root', [
                makeNode('Leaf1', []),
                makeNode('Leaf2', []),
            ]));
            expect(inspector.getLines(10).length).toBe(3);
            // Attempt collapse on a leaf sibling — should be a no-op
            inspector.selectNext(); // select Leaf1
            inspector.toggleExpand();
            expect(inspector.getLines(10).length).toBe(3);
        });
    });

    // ── 8. expandAll() after multiple collapses ───────

    describe('expandAll after multiple collapses', () => {
        it('restores full visibility after collapsing several branches', () => {
            inspector.updateTree(makeNode('Root', [
                makeNode('Branch1', [makeNode('L1a'), makeNode('L1b')]),
                makeNode('Branch2', [makeNode('L2a')]),
                makeNode('Branch3', [makeNode('L3a'), makeNode('L3b'), makeNode('L3c')]),
            ]));
            // Total nodes: Root + 3 branches + 2 + 1 + 3 leaves = 10
            expect(inspector.getLines(20).length).toBe(10);

            inspector.collapseAll();
            expect(inspector.getLines(20).length).toBe(1); // only Root visible

            inspector.expandAll();
            expect(inspector.getLines(20).length).toBe(10);
        });

        it('expandAll clears all individual toggle-collapses', () => {
            inspector.updateTree(makeNode('Root', [
                makeNode('A', [makeNode('X')]),
                makeNode('B', [makeNode('Y')]),
            ]));

            // Collapse Root manually
            inspector.toggleExpand();
            // Expand Root again
            inspector.toggleExpand();
            // Collapse A (now at index 1)
            inspector.selectNext();
            inspector.toggleExpand();

            // Visible: Root(0), A(1, collapsed — X hidden), B(2), Y(3) = 4
            expect(inspector.getLines(20).length).toBe(4);

            inspector.expandAll();
            expect(inspector.getLines(20).length).toBe(5); // Root, A, X, B, Y
        });
    });

    // ── 9. collapseAll() safety with null tree ────────

    describe('collapseAll with null tree', () => {
        it('does not throw when called with no tree set', () => {
            expect(() => inspector.collapseAll()).not.toThrow();
        });

        it('does not throw after updateTree(null)', () => {
            inspector.updateTree(makeNode('Box', [makeNode('A')]));
            inspector.updateTree(null);
            expect(() => inspector.collapseAll()).not.toThrow();
        });

        it('inspector remains in valid state after null+collapseAll', () => {
            inspector.updateTree(null);
            inspector.collapseAll();

            expect(inspector.nodeCount).toBe(0);
            expect(inspector.selectedIndex).toBe(0);
            expect(inspector.getSelectedNode()).toBeNull();
            expect(inspector.getLines(10)).toEqual(['  No widget tree data']);
        });

        it('expandAll after null+collapseAll is also safe', () => {
            inspector.updateTree(null);
            inspector.collapseAll();
            expect(() => inspector.expandAll()).not.toThrow();
            expect(inspector.getLines(10)).toEqual(['  No widget tree data']);
        });
    });

    // ── 10. Stress test — large trees ─────────────────

    describe('stress test with large trees', () => {
        /** Build a balanced tree: `width` children at each level, `depth` levels deep. */
        function makeLargeTree(depth: number, width: number, id?: string): WidgetNode {
            if (depth === 0) return makeNode('Leaf', [], id);
            const children = Array.from({ length: width }, (_, i) =>
                makeLargeTree(depth - 1, width, id ? `${id}-${i}` : undefined),
            );
            return makeNode('Node', children, id);
        }

        it('nodeCount is correct for a 3-level wide tree (3^3+... = 40 nodes)', () => {
            // depth=3, width=3 => 1 + 3 + 9 + 27 = 40 nodes
            inspector.updateTree(makeLargeTree(3, 3, 'root'));
            expect(inspector.nodeCount).toBe(40);
        });

        it('flattening completes and returns correct visible line count', () => {
            inspector.updateTree(makeLargeTree(3, 3, 'root'));
            const lines = inspector.getLines(200);
            expect(lines.length).toBe(40);
        });

        it('selection operations stay in bounds on a large tree', () => {
            inspector.updateTree(makeLargeTree(3, 3, 'root'));
            for (let i = 0; i < 100; i++) inspector.selectNext();
            expect(inspector.selectedIndex).toBeLessThan(40);
            expect(inspector.selectedIndex).toBeGreaterThanOrEqual(0);
            expect(inspector.getSelectedNode()).not.toBeNull();
        });

        it('collapseAll on a large tree yields a single visible node', () => {
            inspector.updateTree(makeLargeTree(3, 3, 'root'));
            inspector.collapseAll();
            expect(inspector.getLines(200).length).toBe(1);
        });

        it('expandAll after collapseAll on a large tree restores all nodes', () => {
            inspector.updateTree(makeLargeTree(3, 3, 'root'));
            inspector.collapseAll();
            inspector.expandAll();
            expect(inspector.getLines(200).length).toBe(40);
        });

        it('nodeCount stays correct after collapse and expand cycles', () => {
            inspector.updateTree(makeLargeTree(3, 3, 'root'));
            inspector.collapseAll();
            inspector.expandAll();
            inspector.collapseAll();
            expect(inspector.nodeCount).toBe(40);
        });
    });
});
