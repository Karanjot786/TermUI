// Tree — expandable/collapsible tree view
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface TreeNode { label: string; children?: TreeNode[]; expanded?: boolean; icon?: string; }
export interface TreeOptions { activeColor?: Style['fg']; onSelect?: (node: TreeNode, path: number[]) => void; }

export class Tree extends Widget {
    private _roots: TreeNode[];
    private _cursorIndex = 0;
    private _activeColor: Style['fg'];
    private _onSelect?: (node: TreeNode, path: number[]) => void;
    focusable = true;

    constructor(roots: TreeNode[], options: TreeOptions = {}) {
        super(mergeStyles(defaultStyle(), { flexGrow: 1 }));
        this._roots = roots;
        this._activeColor = options.activeColor ?? { type: 'named', name: 'cyan' };
        this._onSelect = options.onSelect;
    }

    private _flatten(): { node: TreeNode; depth: number; path: number[]; hasChildren: boolean }[] {
        const result: { node: TreeNode; depth: number; path: number[]; hasChildren: boolean }[] = [];
        const walk = (nodes: TreeNode[], depth: number, path: number[]) => {
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const hasChildren = (node.children?.length ?? 0) > 0;
                result.push({ node, depth, path: [...path, i], hasChildren });
                if (hasChildren && node.expanded) walk(node.children!, depth + 1, [...path, i]);
            }
        };
        walk(this._roots, 0, []);
        return result;
    }

    selectNext(): void { const f = this._flatten(); if (this._cursorIndex < f.length - 1) { this._cursorIndex++; this.markDirty(); } }
    selectPrev(): void { if (this._cursorIndex > 0) { this._cursorIndex--; this.markDirty(); } }
    toggleExpand(): void { const f = this._flatten(); const it = f[this._cursorIndex]; if (it?.hasChildren) { it.node.expanded = !it.node.expanded; this.markDirty(); } }
    confirm(): void {
        const f = this._flatten(); const it = f[this._cursorIndex];
        if (it) { it.hasChildren ? this.toggleExpand() : this._onSelect?.(it.node, it.path); }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        const flat = this._flatten();
        for (let i = 0; i < flat.length && i < height; i++) {
            const it = flat[i];
            const active = i === this._cursorIndex;
            const indent = '  '.repeat(it.depth);
            const icon = it.hasChildren ? (it.node.expanded ? (caps.unicode ? '▼ ' : 'v ') : (caps.unicode ? '▶ ' : '> ')) : '  ';
            const nodeIcon = it.node.icon ? `${it.node.icon} ` : '';
            const line = `${indent}${icon}${nodeIcon}${it.node.label}`;
            screen.writeString(x, y + i, line.slice(0, width), { ...attrs, fg: active ? this._activeColor : attrs.fg, bold: active });
        }
    }
}
