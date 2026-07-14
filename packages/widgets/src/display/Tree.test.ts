// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Tree widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tree, type TreeNode } from './Tree.js';
import { Screen, caps } from '@termuijs/core';

// ── Helpers ──────────────────────────────────────────

function makeTree(nodes: TreeNode[], onSelect?: (node: TreeNode, path: number[]) => void, width = 40, height = 20) {
    const tree = new Tree({ nodes, onSelect });
    tree.updateRect({ x: 0, y: 0, width, height });
    return tree;
}

// helper to easily call handleKey
function renderTree(tree: Tree, width = 40, height = 20): Screen {
    const screen = new Screen(width, height);
    tree.updateRect({ x: 0, y: 0, width, height });
    tree.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

// ── Fixtures ─────────────────────────────────────────

function makeNodes(): TreeNode[] {
    return [
        {
            label: 'src',
            children: [
                {
                    label: 'components',
                    children: [{ label: 'Button.ts' }],
                    expanded: false,
                },
                {
                    label: 'utils',
                    children: [
                        { label: 'helper.ts' },
                        { label: 'types.ts' },
                    ],
                    expanded: false,
                },
            ],
            expanded: false,
        },
        { label: 'package.json' },
    ];
}

// ── Tests ─────────────────────────────────────────────

describe('Tree', () => {

    describe('1. Renders root nodes with correct chevrons', () => {
        it('shows collapsed chevron for parent nodes', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            const screen = renderTree(tree);

            const row0 = rowText(screen, 0);
            // "src" is a collapsed parent — should show collapsed chevron
            // Unicode: ▶, ASCII fallback: >
            expect(row0).toMatch(/[▶>]\s*src/);
        });

        it('shows leaf prefix for leaf nodes', () => {
            const nodes: TreeNode[] = [
                { label: 'README.md' },
            ];
            const tree = makeTree(nodes);
            const screen = renderTree(tree);

            const row0 = rowText(screen, 0);
            // Unicode: •, ASCII fallback: *
            expect(row0).toMatch(/[•*]\s*README\.md/);
        });

        it('renders all root nodes', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            const screen = renderTree(tree);

            const row0 = rowText(screen, 0);
            const row1 = rowText(screen, 1);
            expect(row0).toContain('src');
            expect(row1).toContain('package.json');
        });
    });

    describe('2. Collapsed parent does not show children', () => {
        it('children are not rendered when parent is collapsed', () => {
            const nodes = makeNodes(); // src starts collapsed
            const tree = makeTree(nodes);
            const screen = renderTree(tree);

            // Only 2 root nodes should be visible
            const row2 = rowText(screen, 2);
            // Row 2 should be empty (no "components" or "utils" visible)
            expect(row2.trim()).toBe('');
        });

        it('visibleNodes only includes root items when all collapsed', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            // 2 root nodes: "src" and "package.json"
            expect((tree as any)._visibleNodes.length).toBe(2);
        });
    });

    describe('3. Expanding a parent shows children', () => {
        it('expand() reveals children of selected node', () => {
            const nodes = makeNodes(); // src at index 0
            const tree = makeTree(nodes);

            // src is selected (index 0) and collapsed
            tree.expand();

            const screen = renderTree(tree);
            // Row 1 should now show "components"
            const row1 = rowText(screen, 1);
            expect(row1).toContain('components');
        });

        it('visibleNodes grows after expanding', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            const before = (tree as any)._visibleNodes.length;

            tree.expand(); // expand "src"

            const after = (tree as any)._visibleNodes.length;
            expect(after).toBeGreaterThan(before);
        });
    });

    describe('4. Cursor moves with down / up', () => {
        it('down moves cursor down', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            expect(tree.selectedIndex).toBe(0);

            tree.handleKey('down');
            expect(tree.selectedIndex).toBe(1);
        });

        it('supports standard KeyEvent objects', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            expect(tree.selectedIndex).toBe(0);

            tree.handleKey({ key: 'down', ch: '', ctrl: false, meta: false, shift: false });
            expect(tree.selectedIndex).toBe(1);
        });

        it('j moves cursor down (vim keybinding)', () => {
            vi.spyOn(caps, 'keybindingMode', 'get').mockReturnValue('vim');
            const nodes = makeNodes();
            const tree = makeTree(nodes);

            tree.handleKey('j');
            expect(tree.selectedIndex).toBe(1);
            vi.restoreAllMocks();
        });

        it('up moves cursor up', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);

            tree.handleKey('down'); // → 1
            tree.handleKey('up');   // → 0
            expect(tree.selectedIndex).toBe(0);
        });

        it('k moves cursor up (vim keybinding)', () => {
            vi.spyOn(caps, 'keybindingMode', 'get').mockReturnValue('vim');
            const nodes = makeNodes();
            const tree = makeTree(nodes);

            tree.handleKey('j'); // → 1
            tree.handleKey('k'); // → 0
            expect(tree.selectedIndex).toBe(0);
            vi.restoreAllMocks();
        });

        it('up at first item is a no-op', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            tree.handleKey('up');
            expect(tree.selectedIndex).toBe(0);
        });

        it('down at last item is a no-op', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            tree.handleKey('down'); // → 1 (last)
            tree.handleKey('down'); // no-op
            expect(tree.selectedIndex).toBe(1);
        });
    });

    describe('5. right expands a collapsed parent', () => {
        it('right expands collapsed parent', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            // "src" is at index 0, collapsed

            tree.handleKey('right');

            expect(nodes[0].expanded).toBe(true);
        });

        it('l expands collapsed parent (vim keybinding)', () => {
            vi.spyOn(caps, 'keybindingMode', 'get').mockReturnValue('vim');
            const nodes = makeNodes();
            const tree = makeTree(nodes);

            tree.handleKey('l');

            expect(nodes[0].expanded).toBe(true);
            vi.restoreAllMocks();
        });

        it('right on already-expanded parent is a no-op', () => {
            const nodes = makeNodes();
            nodes[0].expanded = true;
            const tree = makeTree(nodes);

            const before = (tree as any)._visibleNodes.length;
            tree.handleKey('right'); // already expanded
            const after = (tree as any)._visibleNodes.length;

            // No change
            expect(after).toBe(before);
        });
    });

    describe('6. left collapses an expanded parent', () => {
        it('left collapses an expanded parent', () => {
            const nodes = makeNodes();
            nodes[0].expanded = true;
            const tree = makeTree(nodes);
            // src is expanded and selected

            tree.handleKey('left');

            expect(nodes[0].expanded).toBe(false);
        });

        it('h collapses expanded parent (vim keybinding)', () => {
            vi.spyOn(caps, 'keybindingMode', 'get').mockReturnValue('vim');
            const nodes = makeNodes();
            nodes[0].expanded = true;
            const tree = makeTree(nodes);

            tree.handleKey('h');

            expect(nodes[0].expanded).toBe(false);
            vi.restoreAllMocks();
        });

        it('left on collapsed node moves to parent', () => {
            const nodes = makeNodes();
            nodes[0].expanded = true;
            const tree = makeTree(nodes);
            // visible: [src(0), components(1), utils(2), package.json(3)]
            tree.handleKey('down'); // → components (index 1)
            tree.handleKey('left'); // components is collapsed → move to parent (src, index 0)

            expect(tree.selectedIndex).toBe(0);
        });
    });

    describe('7. onSelect called when enter pressed on leaf node', () => {
        it('calls onSelect for a leaf node on enter', () => {
            const handler = vi.fn();
            const nodes: TreeNode[] = [{ label: 'README.md', data: 'readme' }];
            const tree = makeTree(nodes, handler);

            tree.handleKey('enter');

            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith(nodes[0], [0]);
        });

        it('calls onSelect for a leaf node on Space', () => {
            const handler = vi.fn();
            const nodes: TreeNode[] = [{ label: 'index.ts' }];
            const tree = makeTree(nodes, handler);

            tree.handleKey('space');

            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith(nodes[0], [0]);
        });

        it('does not call onSelect when enter pressed on parent node', () => {
            const handler = vi.fn();
            const nodes = makeNodes(); // src is a parent
            const tree = makeTree(nodes, handler);

            tree.handleKey('enter'); // should toggle, not select

            expect(handler).not.toHaveBeenCalled();
        });

        it('calls onSelect with correct path for nested leaf', () => {
            const handler = vi.fn();
            const nodes = makeNodes();
            nodes[0].expanded = true;    // expand src
            nodes[0].children![0].expanded = true; // expand components
            const tree = makeTree(nodes, handler);
            // visible: src(0), components(1), Button.ts(2), utils(3), package.json(4)

            // Navigate to Button.ts (index 2)
            tree.handleKey('down'); // → 1 (components)
            tree.handleKey('down'); // → 2 (Button.ts)
            tree.handleKey('enter');

            expect(handler).toHaveBeenCalledOnce();
            const [calledNode, calledPath] = handler.mock.calls[0];
            expect(calledNode.label).toBe('Button.ts');
            expect(calledPath).toEqual([0, 0, 0]);
        });
    });

    describe('home / end navigation', () => {
        it('home moves to first node', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            tree.handleKey('down');
            tree.handleKey('home');
            expect(tree.selectedIndex).toBe(0);
        });

        it('end moves to last visible node', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            tree.handleKey('end');
            expect(tree.selectedIndex).toBe(1); // "package.json"
        });
    });

    describe('setNodes()', () => {
        it('resets selection and rebuilds visible nodes', () => {
            const tree = makeTree(makeNodes());
            tree.handleKey('down');
            expect(tree.selectedIndex).toBe(1);

            const newNodes: TreeNode[] = [{ label: 'only' }];
            tree.setNodes(newNodes);

            expect(tree.selectedIndex).toBe(0);
            expect((tree as any)._visibleNodes.length).toBe(1);
        });
    });

    it('clamps selectedIndex when visible nodes shrink (external collapse)', () => {
        const nodes: TreeNode[] = [
            { label: 'Parent', expanded: true, children: [
                { label: 'Child A' },
                { label: 'Child B' },
            ] },
            { label: 'Sibling' },
        ];

        const tree = makeTree(nodes);
        // visible: Parent(0), Child A(1), Child B(2), Sibling(3)
        tree.handleKey('down'); // -> 1
        tree.handleKey('down'); // -> 2 (Child B)
        expect(tree.selectedIndex).toBe(2);

        // Simulate external mutation and force a rebuild.
        // The cast is required: there is no public API that reproduces an
        // external node mutation while preserving the pre-mutation selection,
        // so the test invokes the private rebuild helper to simulate that case.
        nodes[0].expanded = false;
        (tree as any)._buildVisibleNodes();

        // Observable behavior: selectedIndex must update to remain valid.
        expect(tree.selectedIndex).toBe(1);
    });

        describe('Virtualization', () => {
        it('updates scroll offset via keyboard navigation when moving past viewport', () => {
            // Generate many nodes
            const manyNodes = Array.from({ length: 50 }).map((_, i) => ({ label: `Node${i}` }));
            
            // makeTree helper in this file accepts (nodes, onSelect, width, height)
            // We set height to 10
            const tree = makeTree(manyNodes, undefined, 40, 10);
            
            // Initially, selectedIndex is 0, offset is 0
            expect(tree.selectedIndex).toBe(0);
            expect((tree as any)._scrollOffset).toBe(0);

            // Move down past the viewport
            for (let i = 0; i < 20; i++) {
                tree.handleKey('down');
            }
            
            expect(tree.selectedIndex).toBe(20);
            
            // Viewport height is 10
            // So if selected is 20, offset should be clamped to 20 - 10 + 1 = 11
            expect((tree as any)._scrollOffset).toBe(11);
        });
    });

});
