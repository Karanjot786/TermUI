// Tree — expandable/collapsible tree view with search and lazy loading
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface TreeNode {
    label: string;
    children?: TreeNode[];
    expanded?: boolean;
    icon?: string;
    /** Whether this node has children but they haven't been loaded yet */
    lazy?: boolean;
    /** Optional search text to match against */
    searchText?: string;
}

export interface TreeOptions {
    activeColor?: Style['fg'];
    onSelect?: (node: TreeNode, path: number[]) => void;
    /** Called when a lazy node is expanded for the first time */
    onLazyLoad?: (node: TreeNode, path: number[]) => Promise<TreeNode[]> | TreeNode[];
    /** Current search query (set externally from a search input) */
    searchQuery?: string;
    /** Color for matching search terms */
    searchHighlightColor?: Style['fg'];
    /** Show icons for folder/file types */
    showIcons?: boolean;
    /** Indent size per depth level */
    indentSize?: number;
}

export class Tree extends Widget {
    private _roots: TreeNode[];
    private _cursorIndex = 0;
    private _activeColor: Style['fg'];
    private _searchHighlightColor: Style['fg'];
    private _onSelect?: (node: TreeNode, path: number[]) => void;
    private _onLazyLoad?: (node: TreeNode, path: number[]) => Promise<TreeNode[]> | TreeNode[];
    private _searchQuery = '';
    private _loadingPaths = new Set<string>();
    private _showIcons: boolean;
    private _indentSize: number;
    focusable = true;

    constructor(roots: TreeNode[], options: TreeOptions = {}) {
        super(mergeStyles(defaultStyle(), { flexGrow: 1 }));
        this._roots = roots;
        this._activeColor = options.activeColor ?? { type: 'named', name: 'cyan' };
        this._searchHighlightColor = options.searchHighlightColor ?? { type: 'named', name: 'yellow' };
        this._onSelect = options.onSelect;
        this._onLazyLoad = options.onLazyLoad;
        this._searchQuery = options.searchQuery ?? '';
        this._showIcons = options.showIcons ?? true;
        this._indentSize = options.indentSize ?? 2;
    }

    setSearchQuery(query: string): void {
        this._searchQuery = query;
        this._cursorIndex = 0;
        this.markDirty();
    }

    get searchQuery(): string {
        return this._searchQuery;
    }

    setRoots(roots: TreeNode[]): void {
        this._roots = roots;
        this._cursorIndex = 0;
        this.markDirty();
    }

    getRoots(): TreeNode[] {
        return this._roots;
    }

    /** Expand all nodes recursively */
    expandAll(): void {
        const expand = (nodes: TreeNode[]) => {
            for (const node of nodes) {
                if (node.children?.length) {
                    node.expanded = true;
                    expand(node.children);
                }
            }
        };
        expand(this._roots);
        this.markDirty();
    }

    /** Collapse all nodes recursively */
    collapseAll(): void {
        const collapse = (nodes: TreeNode[]) => {
            for (const node of nodes) {
                node.expanded = false;
                if (node.children?.length) collapse(node.children);
            }
        };
        collapse(this._roots);
        this._cursorIndex = 0;
        this.markDirty();
    }

    /** Expand nodes to reveal a specific path */
    expandToPath(path: number[]): void {
        let nodes = this._roots;
        for (let i = 0; i < path.length - 1; i++) {
            const idx = path[i];
            if (idx >= 0 && idx < nodes.length) {
                nodes[idx].expanded = true;
                if (nodes[idx].children) {
                    nodes = nodes[idx].children!;
                }
            }
        }
        // Find the target node in flattened list and set cursor
        const flat = this._flatten();
        const idx = flat.findIndex(f =>
            f.path.length === path.length &&
            f.path.every((v: number, j: number) => v === path[j])
        );
        if (idx >= 0) {
            this._cursorIndex = idx;
        }
        this.markDirty();
    }

    private _flatten(): { node: TreeNode; depth: number; path: number[]; hasChildren: boolean; loading: boolean; matchesSearch: boolean }[] {
        const result: { node: TreeNode; depth: number; path: number[]; hasChildren: boolean; loading: boolean; matchesSearch: boolean }[] = [];
        const query = this._searchQuery.toLowerCase();

        const walk = (nodes: TreeNode[], depth: number, path: number[]) => {
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const hasChildren = (node.children?.length ?? 0) > 0 || !!node.lazy;
                const matchesSearch = !query ||
                    node.label.toLowerCase().includes(query) ||
                    (node.searchText?.toLowerCase().includes(query) ?? false);

                result.push({ node, depth, path: [...path, i], hasChildren, loading: this._loadingPaths.has(path.join(',')), matchesSearch });

                if (hasChildren && node.expanded && node.children) {
                    walk(node.children, depth + 1, [...path, i]);
                }
            }
        };
        walk(this._roots, 0, []);
        return result;
    }

    selectNext(): void {
        const f = this._flatten();
        if (this._cursorIndex < f.length - 1) {
            this._cursorIndex++;
            this.markDirty();
        }
    }

    selectPrev(): void {
        if (this._cursorIndex > 0) {
            this._cursorIndex--;
            this.markDirty();
        }
    }

    async toggleExpand(): Promise<void> {
        const f = this._flatten();
        const it = f[this._cursorIndex];
        if (!it?.hasChildren) return;

        // Lazy loading
        if (it.node.lazy && !it.node.children) {
            const pathKey = it.path.join(',');
            this._loadingPaths.add(pathKey);
            this.markDirty();

            try {
                const children = await this._onLazyLoad?.(it.node, it.path) ?? [];
                it.node.children = children;
                it.node.lazy = false;
            } finally {
                this._loadingPaths.delete(pathKey);
            }
        }

        it.node.expanded = !it.node.expanded;
        this.markDirty();
    }

    confirm(): void {
        const f = this._flatten();
        const it = f[this._cursorIndex];
        if (it) {
            if (it.hasChildren) {
                this.toggleExpand();
            } else {
                this._onSelect?.(it.node, it.path);
            }
        }
    }

    handleKey(event: import('@termuijs/core').KeyEvent): void {
        switch (event.key) {
            case 'up':
            case 'k':
                this.selectPrev();
                break;
            case 'down':
            case 'j':
                this.selectNext();
                break;
            case 'left':
            case 'h': {
                const f = this._flatten();
                const it = f[this._cursorIndex];
                if (it?.hasChildren && it.node.expanded) {
                    it.node.expanded = false;
                    this.markDirty();
                }
                break;
            }
            case 'right':
            case 'l': {
                const f = this._flatten();
                const it = f[this._cursorIndex];
                if (it?.hasChildren && !it.node.expanded) {
                    this.toggleExpand();
                }
                break;
            }
            case 'enter':
            case 'return':
                this.confirm();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        const flat = this._flatten();

        for (let i = 0; i < flat.length && i < height; i++) {
            const it = flat[i];
            const active = i === this._cursorIndex;
            const indent = ' '.repeat(it.depth * this._indentSize);

            // Loading spinner for lazy nodes
            const loadingSpinner = it.loading ? (caps.unicode ? '◌ ' : '? ') : '';

            // Expand/collapse icon
            let expandIcon = '  ';
            if (it.hasChildren) {
                if (it.loading) {
                    expandIcon = caps.unicode ? '◌ ' : '? ';
                } else if (it.node.expanded) {
                    expandIcon = caps.unicode ? '▼ ' : 'v ';
                } else {
                    expandIcon = caps.unicode ? '▶ ' : '> ';
                }
            }

            // Node icon
            let nodeIcon = '';
            if (this._showIcons) {
                if (it.node.icon) {
                    nodeIcon = `${it.node.icon} `;
                } else if (it.hasChildren) {
                    nodeIcon = it.node.expanded ? (caps.unicode ? '📂 ' : '+ ') : (caps.unicode ? '📁 ' : '- ');
                } else {
                    nodeIcon = caps.unicode ? '📄 ' : '  ';
                }
            }

            const label = it.node.label;

            // Search highlighting
            let displayText = `${indent}${loadingSpinner}${expandIcon}${nodeIcon}${label}`;
            if (active) {
                displayText = displayText.slice(0, width);
                screen.writeString(x, y + i, displayText, {
                    ...attrs,
                    fg: this._activeColor,
                    bold: true,
                });
            } else if (it.matchesSearch && this._searchQuery) {
                // Highlight matching text
                const lowerLabel = label.toLowerCase();
                const query = this._searchQuery.toLowerCase();
                const matchIdx = lowerLabel.indexOf(query);
                if (matchIdx >= 0) {
                    const prefix = `${indent}${loadingSpinner}${expandIcon}${nodeIcon}`;
                    const before = label.slice(0, matchIdx);
                    const match = label.slice(matchIdx, matchIdx + query.length);
                    const after = label.slice(matchIdx + query.length);
                    const fullPrefix = prefix;
                    screen.writeString(x, y + i, fullPrefix + before, attrs);
                    screen.writeString(x + fullPrefix.length + before.length, y + i, match, {
                        ...attrs,
                        fg: this._searchHighlightColor,
                        bold: true,
                    });
                    screen.writeString(x + fullPrefix.length + before.length + match.length, y + i, after, attrs);
                    continue;
                }
                screen.writeString(x, y + i, displayText.slice(0, width), attrs);
            } else {
                screen.writeString(x, y + i, displayText.slice(0, width), attrs);
            }
        }
    }
}
