// ─────────────────────────────────────────────────────
// Widget Tree Inspector — toggleable interactive view
// of the live component hierarchy.
//
// Pure data/logic module. Produces string lines for
// display; does not render to Screen directly.
// ─────────────────────────────────────────────────────

import type { WidgetNode } from './devtools.js';
import { caps } from '@termuijs/core';

/** A flattened entry in the visible tree list. */
interface FlatEntry {
    node: WidgetNode;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
    /** Stable key used for the collapsed set. */
    key: string;
}

/**
 * Toggleable widget tree inspector.
 *
 * Walks a `WidgetNode` snapshot and provides interactive,
 * navigable, expand/collapse tree output as plain-text lines.
 *
 * Usage:
 * ```ts
 * const inspector = new WidgetTreeInspector();
 * inspector.updateTree(widgetTreeSnapshot);
 * inspector.toggle(); // show
 * const lines = inspector.getLines(20);
 * ```
 */
export class WidgetTreeInspector {
    private _visible = false;
    private _tree: WidgetNode | null = null;
    private _flatList: FlatEntry[] = [];
    private _selectedIndex = 0;
    private _collapsedKeys: Set<string> = new Set();

    // ── Visibility ───────────────────────────────────

    get visible(): boolean { return this._visible; }
    toggle(): void { this._visible = !this._visible; }
    show(): void { this._visible = true; }
    hide(): void { this._visible = false; }

    // ── Tree data ────────────────────────────────────

    /**
     * Replace the current widget tree snapshot and rebuild
     * the flat list. Pass `null` to clear.
     */
    updateTree(root: WidgetNode | null): void {
        this._tree = root;
        this._rebuildFlatList();
    }

    /** Total node count in the full tree (including collapsed subtrees). */
    get nodeCount(): number {
        if (!this._tree) return 0;
        return this._countNodes(this._tree);
    }

    // ── Selection ────────────────────────────────────

    get selectedIndex(): number { return this._selectedIndex; }

    selectNext(): void {
        if (this._flatList.length === 0) return;
        this._selectedIndex = Math.min(
            this._selectedIndex + 1,
            this._flatList.length - 1,
        );
    }

    selectPrev(): void {
        if (this._flatList.length === 0) return;
        this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
    }

    /** Return the WidgetNode at the current selection, or null. */
    getSelectedNode(): WidgetNode | null {
        if (this._flatList.length === 0) return null;
        return this._flatList[this._selectedIndex]?.node ?? null;
    }

    // ── Expand / Collapse ────────────────────────────

    /** Toggle expand/collapse for the currently selected node. */
    toggleExpand(): void {
        const entry = this._flatList[this._selectedIndex];
        if (!entry || !entry.hasChildren) return;
        if (this._collapsedKeys.has(entry.key)) {
            this._collapsedKeys.delete(entry.key);
        } else {
            this._collapsedKeys.add(entry.key);
        }
        this._rebuildFlatList();
    }

    /** Expand all nodes. */
    expandAll(): void {
        this._collapsedKeys.clear();
        this._rebuildFlatList();
    }

    /** Collapse all nodes that have children. */
    collapseAll(): void {
        if (!this._tree) return;
        this._walkForCollapse(this._tree, []);
        this._rebuildFlatList();
    }

    // ── Rendering ────────────────────────────────────

    /**
     * Return indented tree lines for display.
     * @param maxLines Maximum number of lines to return.
     */
    getLines(maxLines: number): string[] {
        if (!this._tree || this._flatList.length === 0) {
            return ['  No widget tree data'];
        }

        const lines: string[] = [];
        for (let i = 0; i < this._flatList.length && lines.length < maxLines; i++) {
            const entry = this._flatList[i];
            const indent = '  '.repeat(entry.depth + 1);
            const marker = this._getMarker(entry);
            const selected = i === this._selectedIndex ? '>' : ' ';
            const rect = `(${entry.node.rect.x},${entry.node.rect.y} ${entry.node.rect.width}x${entry.node.rect.height})`;
            const id = entry.node.id ? '#' + entry.node.id : '';
            lines.push(
                `${selected}${indent}${marker}${entry.node.type}${id} ${rect}`,
            );
        }

        return lines;
    }

    // ── Private helpers ──────────────────────────────

    /** Build a stable key for a node for collapse tracking. */
    private _nodeKey(node: WidgetNode, path: number[]): string {
        if (node.id) return `${node.type}#${node.id}`;
        return `${node.type}@${path.join('.')}`;
    }

    /** Get the expand/collapse marker character. */
    private _getMarker(entry: FlatEntry): string {
        if (!entry.hasChildren) return '  ';
        return entry.expanded
            ? (caps.unicode ? '\u25be ' : 'v ')
            : (caps.unicode ? '\u25b8 ' : '> ');
    }

    /** Recursively count all nodes in a tree. */
    private _countNodes(node: WidgetNode): number {
        let count = 1;
        for (const child of node.children) {
            count += this._countNodes(child);
        }
        return count;
    }

    /** Rebuild the flat visible list from the current tree and collapse state. */
    private _rebuildFlatList(): void {
        this._flatList = [];
        if (this._tree) {
            this._flatten(this._tree, 0, []);
        }
        // Clamp selection to new bounds
        if (this._selectedIndex >= this._flatList.length) {
            this._selectedIndex = Math.max(0, this._flatList.length - 1);
        }
    }

    /** Recursively flatten the tree, skipping children of collapsed nodes. */
    private _flatten(node: WidgetNode, depth: number, path: number[]): void {
        const key = this._nodeKey(node, path);
        const hasChildren = node.children.length > 0;
        const expanded = !this._collapsedKeys.has(key);

        this._flatList.push({ node, depth, hasChildren, expanded, key });

        if (hasChildren && expanded) {
            for (let i = 0; i < node.children.length; i++) {
                this._flatten(node.children[i], depth + 1, [...path, i]);
            }
        }
    }

    /** Walk the full tree and mark every node with children as collapsed. */
    private _walkForCollapse(node: WidgetNode, path: number[]): void {
        if (node.children.length > 0) {
            this._collapsedKeys.add(this._nodeKey(node, path));
        }
        for (let i = 0; i < node.children.length; i++) {
            this._walkForCollapse(node.children[i], [...path, i]);
        }
    }
}
