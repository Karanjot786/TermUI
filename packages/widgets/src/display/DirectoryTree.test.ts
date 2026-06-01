import { describe, it, expect, vi, afterEach } from 'vitest';
import { DirectoryTree } from './DirectoryTree.js';
import { Screen, caps } from '@termuijs/core';

const sampleTree = [
    {
        name: 'src',
        type: 'dir' as const,
        children: [
            { name: 'index.ts', type: 'file' as const },
            { name: 'utils.ts', type: 'file' as const },
        ],
    },
    {
        name: 'readme.md',
        type: 'file' as const,
    },
];

function render(tree: DirectoryTree) {
    const screen = new Screen(40, 10);

    tree.updateRect({ x: 0, y: 0, width: 40, height: 10 });
    tree.render(screen);

    return screen.back
        .map(r => r.map(c => c.char).join(''))
        .join('\n');
}

describe('DirectoryTree', () => {

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders top-level nodes', () => {
        const tree = new DirectoryTree({ tree: sampleTree });

        const output = render(tree);

        expect(output).toContain('src');
        expect(output).toContain('readme.md');
    });

    it('expands directory and renders children', () => {
        const tree = new DirectoryTree({ tree: sampleTree });

        tree.handleKey('Enter');

        const output = render(tree);

        expect(output).toContain('index.ts');
        expect(output).toContain('utils.ts');
    });

    it('collapsing directory hides children', () => {
        const tree = new DirectoryTree({ tree: sampleTree });

        tree.handleKey('Enter'); // expand
        tree.handleKey('Enter'); // collapse

        const output = render(tree);

        expect(output).not.toContain('index.ts');
        expect(output).not.toContain('utils.ts');
    });

    it('fires onSelect when file is selected', () => {
        let selectedNode = '';
        let selectedPath = '';

        const tree = new DirectoryTree({
            tree: sampleTree,
            onSelect: (node, path) => {
                selectedNode = node.name;
                selectedPath = path;
            },
        });

        tree.handleKey('ArrowDown');
        tree.handleKey(' ');

        expect(selectedNode).toBe('readme.md');
        expect(selectedPath).toBe('readme.md');
    });

    it('uses ASCII icons when unicode is disabled', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const tree = new DirectoryTree({ tree: sampleTree });

        const output = render(tree);

        const hasASCIIFile = output.includes('[F]');
        const hasASCIIDir = output.includes('[D]');

        expect(hasASCIIFile || hasASCIIDir).toBe(true);
    });
});
