// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tree widget (collapsible hierarchy)
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    styleToCellAttrs,
    truncate,
    stringWidth,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface TreeNode {
    label: string;
    children?: TreeNode[];
    expanded?: boolean; // default: false
    data?: unknown;     // user data attached to node
}

export interface TreeOptions {
    nodes: TreeNode[];
    onSelect?: (node: TreeNode, path: number[]) => void;
    indent?: number;    // spaces per level, default 2
}

interface VisibleEntry {
    node: TreeNode;
    depth: number;
    path: number[];
}

/**
 * Tree — a collapsible tree widget for displaying hierarchical data.
 *
 * Supports:
 * - Expand/collapse of parent nodes
 * - Keyboard navigation (ArrowUp/Down/Left/Right, j/k/h/l, Home/End)
 * - Enter/Space to toggle or select
 * - onSelect callback for leaf nodes
 * - Unicode and ASCII fallback symbols
 * - Scrolling when tree exceeds visible height
 */
export class Tree extends Widget {
    private _nodes: TreeNode[];
    private _onSelect?: (node: TreeNode, path: number[]) => void;
    protected _indent: number;
    protected _selectedIndex = 0;
    protected _scrollOffset = 0;
    protected _visibleNodes: VisibleEntry[] = [];

    constructor(options: TreeOptions, style: Partial<Style> = {}) {
        super(style);
        this._nodes = options.nodes;
        this._onSelect = options.onSelect;
        this._indent = options.indent ?? 2;
        this.focusable = true;
        this._buildVisibleNodes();
    }

    // ── Public API ─────────────────────────────────────

    get selectedIndex(): number { return this._selectedIndex; }

    get selectedNode(): TreeNode | undefined {
        return this._visibleNodes[this._selectedIndex]?.node;
    }

    setNodes(nodes: TreeNode[]): void {
        this._nodes = nodes;
        this._selectedIndex = 0;
        this._scrollOffset = 0;
        this._buildVisibleNodes();
        this.markDirty();
    }

    /** Move cursor up one visible row */
    movePrev(): void {
        if (this._selectedIndex > 0) {
            this._selectedIndex--;
            this._clampScroll();
            this.markDirty();
        }
    }

    /** Move cursor down one visible row */
    moveNext(): void {
        if (this._selectedIndex < this._visibleNodes.length - 1) {
            this._selectedIndex++;
            this._clampScroll();
            this.markDirty();
        }
    }

    /** Go to first visible node */
    moveFirst(): void {
        this._selectedIndex = 0;
        this._clampScroll();
        this.markDirty();
    }

    /** Go to last visible node */
    moveLast(): void {
        if (this._visibleNodes.length > 0) {
            this._selectedIndex = this._visibleNodes.length - 1;
            this._clampScroll();
            this.markDirty();
        }
    }

    /** Expand the selected node (if it's a collapsed parent) */
    expand(): void {
        const entry = this._visibleNodes[this._selectedIndex];
        if (!entry) return;
        const node = entry.node;
        if (_isParent(node) && !node.expanded) {
            node.expanded = true;
            this._buildVisibleNodes();
            this.markDirty();
        }
    }

    /** Collapse the selected node, or move to parent if already collapsed/leaf */
    collapse(): void {
        const entry = this._visibleNodes[this._selectedIndex];
        if (!entry) return;
        const node = entry.node;

        if (_isParent(node) && node.expanded) {
            // Collapse current node
            node.expanded = false;
            this._buildVisibleNodes();
            this._clampScroll();
            this.markDirty();
        } else if (entry.depth > 0) {
            // Move to parent
            const parentPath = entry.path.slice(0, -1);
            const parentIdx = this._visibleNodes.findIndex(
                e => _pathsEqual(e.path, parentPath),
            );
            if (parentIdx >= 0) {
                this._selectedIndex = parentIdx;
                this._clampScroll();
                this.markDirty();
            }
        }
    }

    /** Toggle expand/collapse (parent) or call onSelect (leaf) */
    toggle(): void {
        const entry = this._visibleNodes[this._selectedIndex];
        if (!entry) return;
        const node = entry.node;

        if (_isParent(node)) {
            node.expanded = !node.expanded;
            this._buildVisibleNodes();
            this._clampScroll();
            this.markDirty();
        } else {
            // Leaf — call onSelect
            this._onSelect?.(node, entry.path);
        }
    }

    /**
     * Handle a key event. Call this from your app's key-routing logic
     * when this widget is focused.
     */
    handleKey(key: string): void {
        switch (key) {
            case 'ArrowUp':
            case 'k':
                this.movePrev();
                break;
            case 'ArrowDown':
            case 'j':
                this.moveNext();
                break;
            case 'Enter':
            case ' ':
                this.toggle();
                break;
            case 'ArrowLeft':
            case 'h':
                this.collapse();
                break;
            case 'ArrowRight':
            case 'l':
                this.expand();
                break;
            case 'Home':
                this.moveFirst();
                break;
            case 'End':
                this.moveLast();
                break;
        }
    }

    // ── Rendering ──────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const useUnicode = caps.unicode;

        const collapsedChevron = useUnicode ? '▶ ' : '> ';
        const expandedChevron  = useUnicode ? '▼ ' : 'v ';
        const leafPrefix       = useUnicode ? '• ' : '* ';

        const visibleCount = Math.min(
            this._visibleNodes.length - this._scrollOffset,
            height,
        );

        for (let i = 0; i < visibleCount; i++) {
            const entryIdx = this._scrollOffset + i;
            const entry = this._visibleNodes[entryIdx];
            const { node, depth } = entry;
            const isSelected = entryIdx === this._selectedIndex;

            // Build line text
            const indentStr = ' '.repeat(this._indent * depth);
            let chevron: string;
            if (_isParent(node)) {
                chevron = node.expanded ? expandedChevron : collapsedChevron;
            } else {
                chevron = leafPrefix;
            }
            let line = indentStr + chevron + node.label;
            line = truncate(line, width);

            // Cell style for selected row
            const cellStyle = isSelected && this.isFocused
                ? {
                    ...attrs,
                    bg: { type: 'named' as const, name: 'blue' as const },
                    bold: true,
                }
                : isSelected
                    ? { ...attrs, bold: true }
                    : attrs;

            screen.writeString(x, y + i, line, cellStyle);

            // Fill rest of row for selection highlight
            if (isSelected && this.isFocused) {
                const lineWidth = stringWidth(line);
                const remaining = width - lineWidth;
                for (let c = 0; c < remaining; c++) {
                    screen.setCell(x + lineWidth + c, y + i, {
                        char: ' ',
                        ...cellStyle,
                    });
                }
            }
        }
    }

    // ── Private helpers ────────────────────────────────

    /** Rebuild the flat visible-node list from the tree */
    private _buildVisibleNodes(): void {
        this._visibleNodes = [];
        _collectVisible(this._nodes, 0, [], this._visibleNodes);
    }

    /** Ensure scroll keeps the selected index in view */
    private _clampScroll(): void {
        const rect = this._getContentRect();
        const visibleHeight = rect.height > 0 ? rect.height : 24; // fallback for zero-rect

        if (this._selectedIndex < this._scrollOffset) {
            this._scrollOffset = this._selectedIndex;
        }
        if (this._selectedIndex >= this._scrollOffset + visibleHeight) {
            this._scrollOffset = this._selectedIndex - visibleHeight + 1;
        }
        this._scrollOffset = Math.max(0, this._scrollOffset);
    }
}

// ── Module-level helpers ───────────────────────────────

function _isParent(node: TreeNode): boolean {
    return Array.isArray(node.children) && node.children.length > 0;
}

function _pathsEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function _collectVisible(
    nodes: TreeNode[],
    depth: number,
    parentPath: number[],
    out: VisibleEntry[],
): void {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const path = [...parentPath, i];
        out.push({ node, depth, path });
        if (_isParent(node) && node.expanded) {
            _collectVisible(node.children!, depth + 1, path, out);
        }
    }
}
