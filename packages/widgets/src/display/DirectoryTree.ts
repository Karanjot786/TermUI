import { Widget } from '../base/Widget.js';
import { caps, type Screen, type Style } from '@termuijs/core';

export type TreeNode = {
name: string;
type: 'file' | 'dir';
children?: TreeNode[];
};

export interface DirectoryTreeOptions {
tree?: TreeNode[];
path?: string;
onSelect?: (node: TreeNode, path: string) => void;
}

type VisibleNode = {
node: TreeNode;
depth: number;
path: string[];
};

export class DirectoryTree extends Widget {
private _tree: TreeNode[] = [];
private _visible: VisibleNode[] = [];
private _selectedIndex = 0;
private _expanded = new Set<string>();


onSelect?: (node: TreeNode, path: string) => void;

constructor(
    options: DirectoryTreeOptions,
    style: Partial<Style> = {},
) {
    super(style);

    this.onSelect = options.onSelect;
    this._tree = options.tree ?? [];

    this._rebuild();
    this.markDirty();
}

private _rebuild() {
    this._visible = [];
    this._walk(this._tree, [], 0);
}

private _walk(nodes: TreeNode[], path: string[], depth: number) {
    for (const node of nodes) {
        const currentPath = [...path, node.name];
        const key = currentPath.join('/');

        this._visible.push({
            node,
            depth,
            path: currentPath,
        });

        if (node.type === 'dir' && this._expanded.has(key)) {
            this._walk(node.children || [], currentPath, depth + 1);
        }
    }
}

private _toggle(node: TreeNode, path: string[]) {
    if (node.type !== 'dir') return;

    const key = path.join('/');

    if (this._expanded.has(key)) {
        this._expanded.delete(key);
    } else {
        this._expanded.add(key);
    }

    this._rebuild();
    this.markDirty();
}

private _select(node: TreeNode, path: string[]) {
    this.onSelect?.(node, path.join('/'));
}

handleKey(key: string) {
    const current = this._visible[this._selectedIndex];
    if (!current) return;

    switch (key) {
        case 'down':
            this._selectedIndex = Math.min(
                this._selectedIndex + 1,
                this._visible.length - 1,
            );
            this.markDirty();
            break;

        case 'up':
            this._selectedIndex = Math.max(
                this._selectedIndex - 1,
                0,
            );
            this.markDirty();
            break;

        case 'right':
        case 'enter':
            if (current.node.type === 'dir') {
                this._toggle(current.node, current.path);
            }
            break;

        case 'left': {
            const keyPath = current.path.join('/');
            if (
                current.node.type === 'dir' &&
                this._expanded.has(keyPath)
            ) {
                this._toggle(current.node, current.path);
            }
            break;
        }

        case 'space':
            this._select(current.node, current.path);
            break;
    }
}

protected _renderSelf(screen: Screen): void {
    const rect = this._getContentRect();
    const width = rect.width;

    const fileIcon = caps.unicode ? '📄' : '[F]';
    const dirIcon = caps.unicode ? '📁' : '[D]';

    for (let i = 0; i < this._visible.length; i++) {
        const item = this._visible[i];
        const isSelected = i === this._selectedIndex;

        const indent = '  '.repeat(item.depth);
        const icon = item.node.type === 'dir' ? dirIcon : fileIcon;

        const line = `${indent}${icon} ${item.node.name}`;

        const text =
            line.length > width
                ? line.slice(0, width)
                : line;

        screen.writeString(rect.x, rect.y + i, text, {
            bold: isSelected,
            bg: isSelected
                ? { type: 'named' as const, name: 'blue' as const }
                : undefined,
        });
    }
}


}
