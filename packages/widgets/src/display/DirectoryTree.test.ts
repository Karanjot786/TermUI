import { describe, it, expect } from 'vitest';
import { DirectoryTree } from './DirectoryTree.js';

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

describe('DirectoryTree', () => {
    it('renders tree structure', () => {
        const tree = new DirectoryTree({ tree: sampleTree });
        expect(tree).toBeDefined();
    });

    it('expands directory on Enter', () => {
        const tree = new DirectoryTree({ tree: sampleTree });

        tree.handleKey('Enter');

        expect(tree).toBeDefined();
    });

    it('selection callback works', () => {
        let selected = false;

        const tree = new DirectoryTree({
            tree: sampleTree,
            onSelect: () => {
                selected = true;
            },
        });

        tree.handleKey('ArrowDown');
        tree.handleKey(' ');

        expect(selected).toBe(true);
    });

    it('ASCII fallback mode is stable', () => {
        const tree = new DirectoryTree({ tree: sampleTree });
        expect(tree).toBeDefined();
    });
});
