// -----------------------------------------------------------------------------
// @termuijs/widgets - UnorderedList widget
// -----------------------------------------------------------------------------

import {
    type Screen,
    type Style,
    caps,
    styleToCellAttrs,
    truncate,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface ListItem {
    text: string;
    children?: ListItem[];
}

export interface UnorderedListOptions {
    /** Bullet characters per nesting level. Default uses Unicode with ASCII fallback. */
    markers?: string[];
    /** Indent width per level. Default: 2 */
    indent?: number;
}

interface VisibleItem {
    item: ListItem;
    depth: number;
}

/**
 * UnorderedList - renders a bulleted list with optional nested children.
 */
export class UnorderedList extends Widget {
    private _items: ListItem[];
    private _markers?: string[];
    private _indent: number;

    constructor(
        items: ListItem[],
        style: Partial<Style> = {},
        opts: UnorderedListOptions = {},
    ) {
        super(style);
        this._items = items;
        this._markers = opts.markers;
        this._indent = opts.indent ?? 2;
    }

    setItems(items: ListItem[]): void {
        this._items = items;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const rows = _flattenItems(this._items);

        for (let i = 0; i < Math.min(rows.length, height); i++) {
            const row = rows[i];
            const marker = this._markerForDepth(row.depth);
            const indent = ' '.repeat(row.depth * this._indent);
            const line = truncate(`${indent}${marker} ${row.item.text}`, width);

            screen.writeString(x, y + i, line, attrs);
        }
    }

    private _markerForDepth(depth: number): string {
        const markers = this._markers ?? _defaultMarkers();
        if (markers.length === 0) return caps.unicode ? '\u2022' : '*';

        return markers[Math.min(depth, markers.length - 1)];
    }
}

function _defaultMarkers(): string[] {
    return caps.unicode
        ? ['\u2022', '\u25E6', '\u25AA']
        : ['*', '-', '+'];
}

function _flattenItems(items: ListItem[], depth = 0, out: VisibleItem[] = []): VisibleItem[] {
    for (const item of items) {
        out.push({ item, depth });
        if (item.children && item.children.length > 0) {
            _flattenItems(item.children, depth + 1, out);
        }
    }

    return out;
}
