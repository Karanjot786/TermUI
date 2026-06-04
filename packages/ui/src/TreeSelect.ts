// TreeSelect — expandable tree with single or multi selection
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface TreeSelectNode {
    label: string;
    value: string;
    children?: TreeSelectNode[];
    expanded?: boolean;
}

export interface TreeSelectOptions {
    multiple?: boolean;
    activeColor?: Style['fg'];
    onChange?: (values: string[]) => void;
}

export class TreeSelect extends Widget {
    private _roots: TreeSelectNode[];
    private _cursorIndex = 0;
    private _selected = new Set<string>();
    private _multiple: boolean;
    private _activeColor: Style['fg'];
    private _onChange?: (values: string[]) => void;
    focusable = true;

    constructor(roots: TreeSelectNode[], options: TreeSelectOptions = {}) {
        super(mergeStyles(defaultStyle(), { flexGrow: 1 }));
        this._roots = roots;
        this._multiple = options.multiple ?? false;
        this._activeColor = options.activeColor ?? { type: 'named', name: 'cyan' };
        this._onChange = options.onChange;
    }

    get selectedValues(): string[] {
        return [...this._selected];
    }

    private _flatten(): { node: TreeSelectNode; depth: number; path: number[]; hasChildren: boolean }[] {
        const result: { node: TreeSelectNode; depth: number; path: number[]; hasChildren: boolean }[] = [];
        const walk = (nodes: TreeSelectNode[], depth: number, path: number[]) => {
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

    expand(): void {
        const f = this._flatten();
        const it = f[this._cursorIndex];
        if (it?.hasChildren && !it.node.expanded) {
            it.node.expanded = true;
            this.markDirty();
        }
    }

    collapse(): void {
        const f = this._flatten();
        const it = f[this._cursorIndex];
        if (!it) return;

        if (it.hasChildren && it.node.expanded) {
            it.node.expanded = false;
            this.markDirty();
            return;
        }

        if (it.depth > 0) {
            const parentPath = it.path.slice(0, -1);
            const parentIdx = f.findIndex(entry => _pathsEqual(entry.path, parentPath));
            if (parentIdx >= 0) {
                this._cursorIndex = parentIdx;
                this.markDirty();
            }
        }
    }

    toggleSelection(): void {
        const f = this._flatten();
        const it = f[this._cursorIndex];
        if (!it) return;

        const value = it.node.value;
        const previous = this.selectedValues;

        if (this._multiple) {
            if (this._selected.has(value)) {
                this._selected.delete(value);
            } else {
                this._selected.add(value);
            }
        } else if (this._selected.has(value)) {
            this._selected.clear();
        } else {
            this._selected.clear();
            this._selected.add(value);
        }

        this.markDirty();
        const next = this.selectedValues;
        if (!_valuesEqual(previous, next)) {
            this._onChange?.(next);
        }
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'down':
                this.selectNext();
                break;
            case 'up':
                this.selectPrev();
                break;
            case 'right':
                this.expand();
                break;
            case 'left':
                this.collapse();
                break;
            case 'space':
                this.toggleSelection();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        const flat = this._flatten();
        const expandCollapsed = caps.unicode ? '▶ ' : '> ';
        const expandExpanded = caps.unicode ? '▼ ' : 'v ';
        const selectedMarker = caps.unicode ? '● ' : '* ';
        const unselectedMarker = caps.unicode ? '○ ' : 'o ';

        for (let i = 0; i < flat.length && i < height; i++) {
            const it = flat[i];
            const active = i === this._cursorIndex;
            const indent = '  '.repeat(it.depth);
            const expandIcon = it.hasChildren
                ? (it.node.expanded ? expandExpanded : expandCollapsed)
                : '  ';
            const selectIcon = this._selected.has(it.node.value) ? selectedMarker : unselectedMarker;
            const line = `${indent}${expandIcon}${selectIcon}${it.node.label}`;
            screen.writeString(x, y + i, line.slice(0, width), {
                ...attrs,
                fg: active ? this._activeColor : attrs.fg,
                bold: active,
            });
        }
    }
}

function _pathsEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function _valuesEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    for (let i = 0; i < sortedA.length; i++) {
        if (sortedA[i] !== sortedB[i]) return false;
    }
    return true;
}
