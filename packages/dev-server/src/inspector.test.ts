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
});
