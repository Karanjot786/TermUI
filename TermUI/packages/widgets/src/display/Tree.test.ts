// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Tree widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tree, type TreeNode } from './Tree.js';
import { Screen } from '@termuijs/core';

// ── Helpers ──────────────────────────────────────────

function makeTree(nodes: TreeNode[], onSelect?: (node: TreeNode, path: number[]) => void, width = 40, height = 20) {
    const tree = new Tree({ nodes, onSelect });
    tree.updateRect({ x: 0, y: 0, width, height });
    return tree;
}

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

    describe('4. Cursor moves with ArrowDown / ArrowUp', () => {
        it('ArrowDown moves cursor down', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            expect(tree.selectedIndex).toBe(0);

            tree.handleKey('ArrowDown');
            expect(tree.selectedIndex).toBe(1);
        });

        it('j moves cursor down (vim keybinding)', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);

            tree.handleKey('j');
            expect(tree.selectedIndex).toBe(1);
        });

        it('ArrowUp moves cursor up', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);

            tree.handleKey('ArrowDown'); // → 1
            tree.handleKey('ArrowUp');   // → 0
            expect(tree.selectedIndex).toBe(0);
        });

        it('k moves cursor up (vim keybinding)', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);

            tree.handleKey('j'); // → 1
            tree.handleKey('k'); // → 0
            expect(tree.selectedIndex).toBe(0);
        });

        it('ArrowUp at first item is a no-op', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            tree.handleKey('ArrowUp');
            expect(tree.selectedIndex).toBe(0);
        });

        it('ArrowDown at last item is a no-op', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            tree.handleKey('ArrowDown'); // → 1 (last)
            tree.handleKey('ArrowDown'); // no-op
            expect(tree.selectedIndex).toBe(1);
        });
    });

    describe('5. ArrowRight expands a collapsed parent', () => {
        it('ArrowRight expands collapsed parent', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            // "src" is at index 0, collapsed

            tree.handleKey('ArrowRight');

            expect(nodes[0].expanded).toBe(true);
        });

        it('l expands collapsed parent (vim keybinding)', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);

            tree.handleKey('l');

            expect(nodes[0].expanded).toBe(true);
        });

        it('ArrowRight on already-expanded parent is a no-op', () => {
            const nodes = makeNodes();
            nodes[0].expanded = true;
            const tree = makeTree(nodes);

            const before = (tree as any)._visibleNodes.length;
            tree.handleKey('ArrowRight'); // already expanded
            const after = (tree as any)._visibleNodes.length;

            // No change
            expect(after).toBe(before);
        });
    });

    describe('6. ArrowLeft collapses an expanded parent', () => {
        it('ArrowLeft collapses an expanded parent', () => {
            const nodes = makeNodes();
            nodes[0].expanded = true;
            const tree = makeTree(nodes);
            // src is expanded and selected

            tree.handleKey('ArrowLeft');

            expect(nodes[0].expanded).toBe(false);
        });

        it('h collapses expanded parent (vim keybinding)', () => {
            const nodes = makeNodes();
            nodes[0].expanded = true;
            const tree = makeTree(nodes);

            tree.handleKey('h');

            expect(nodes[0].expanded).toBe(false);
        });

        it('ArrowLeft on collapsed node moves to parent', () => {
            const nodes = makeNodes();
            nodes[0].expanded = true;
            const tree = makeTree(nodes);
            // visible: [src(0), components(1), utils(2), package.json(3)]
            tree.handleKey('ArrowDown'); // → components (index 1)
            tree.handleKey('ArrowLeft'); // components is collapsed → move to parent (src, index 0)

            expect(tree.selectedIndex).toBe(0);
        });
    });

    describe('7. onSelect called when Enter pressed on leaf node', () => {
        it('calls onSelect for a leaf node on Enter', () => {
            const handler = vi.fn();
            const nodes: TreeNode[] = [{ label: 'README.md', data: 'readme' }];
            const tree = makeTree(nodes, handler);

            tree.handleKey('Enter');

            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith(nodes[0], [0]);
        });

        it('calls onSelect for a leaf node on Space', () => {
            const handler = vi.fn();
            const nodes: TreeNode[] = [{ label: 'index.ts' }];
            const tree = makeTree(nodes, handler);

            tree.handleKey(' ');

            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith(nodes[0], [0]);
        });

        it('does not call onSelect when Enter pressed on parent node', () => {
            const handler = vi.fn();
            const nodes = makeNodes(); // src is a parent
            const tree = makeTree(nodes, handler);

            tree.handleKey('Enter'); // should toggle, not select

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
            tree.handleKey('ArrowDown'); // → 1 (components)
            tree.handleKey('ArrowDown'); // → 2 (Button.ts)
            tree.handleKey('Enter');

            expect(handler).toHaveBeenCalledOnce();
            const [calledNode, calledPath] = handler.mock.calls[0];
            expect(calledNode.label).toBe('Button.ts');
            expect(calledPath).toEqual([0, 0, 0]);
        });
    });

    describe('Home / End navigation', () => {
        it('Home moves to first node', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            tree.handleKey('ArrowDown');
            tree.handleKey('Home');
            expect(tree.selectedIndex).toBe(0);
        });

        it('End moves to last visible node', () => {
            const nodes = makeNodes();
            const tree = makeTree(nodes);
            tree.handleKey('End');
            expect(tree.selectedIndex).toBe(1); // "package.json"
        });
    });

    describe('setNodes()', () => {
        it('resets selection and rebuilds visible nodes', () => {
            const tree = makeTree(makeNodes());
            tree.handleKey('ArrowDown');
            expect(tree.selectedIndex).toBe(1);

            const newNodes: TreeNode[] = [{ label: 'only' }];
            tree.setNodes(newNodes);

            expect(tree.selectedIndex).toBe(0);
            expect((tree as any)._visibleNodes.length).toBe(1);
        });
    });
});
