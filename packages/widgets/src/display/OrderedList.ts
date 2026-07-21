// ─────────────────────────────────────────────────────
// @termuijs/widgets — OrderedList widget
// ─────────────────────────────────────────────────────
import {
    type Screen,
    type Style,
    styleToCellAttrs,
    truncate,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface OrderedListItem {
    text: string;
    /** Nested items */
    children?: OrderedListItem[];
}

export interface OrderedListOptions {
    /** Indent width per level. Default: 3 */
    indent?: number;
    /** Numbering style: '1.' for arabic, 'a.' for lowercase alpha, 'i.' for lowercase roman. Default: '1.' */
    style?: '1.' | 'a.' | 'i.';
}

interface FlatRow {
    text: string;
    prefix: string;
    depth: number;
}

function toAlpha(n: number): string {
    let result = '';
    while (n > 0) {
        n--;
        result = String.fromCharCode(97 + (n % 26)) + result;
        n = Math.floor(n / 26);
    }
    return result || 'a';
}

function toRoman(n: number): string {
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ['m','cm','d','cd','c','xc','l','xl','x','ix','v','iv','i'];
    let result = '';
    for (let i = 0; i < vals.length; i++) {
        while (n >= vals[i]) {
            result += syms[i];
            n -= vals[i];
        }
    }
    return result;
}

function getPrefix(index: number, style: '1.' | 'a.' | 'i.'): string {
    switch (style) {
        case 'a.': return toAlpha(index) + '.';
        case 'i.': return toRoman(index) + '.';
        default:   return index + '.';
    }
}

function flattenItems(
    items: OrderedListItem[],
    depth: number,
    style: '1.' | 'a.' | 'i.',
    out: FlatRow[],
): void {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        out.push({
            text: item.text,
            prefix: getPrefix(i + 1, style),
            depth,
        });
        if (item.children && item.children.length > 0) {
            flattenItems(item.children, depth + 1, style, out);
        }
    }
}

/**
 * OrderedList — renders a numbered list with optional nesting.
 */
export class OrderedList extends Widget {
    private _items: OrderedListItem[];
    private _opts: Required<OrderedListOptions>;

    constructor(
        items: OrderedListItem[],
        style: Partial<Style> = {},
        opts: OrderedListOptions = {},
    ) {
        super(style);
        this._items = items;
        this._opts = {
            indent: Math.max(0, opts.indent ?? 3),
            style: opts.style ?? '1.',
        };
    }

    setItems(items: OrderedListItem[]): void {
        if (items === this._items) {
            return;
        }
        this._items = items;
        this.markDirty();
    }

    getItems(): OrderedListItem[] {
        return this._items;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const rows: FlatRow[] = [];
        flattenItems(this._items, 0, this._opts.style, rows);

        const visibleCount = Math.min(rows.length, height);
        for (let i = 0; i < visibleCount; i++) {
            const { text, prefix, depth } = rows[i];
            const indentStr = ' '.repeat(this._opts.indent * depth);
            let line = `${indentStr}${prefix} ${text}`;
            line = truncate(line, width);
            screen.writeString(x, y + i, line, attrs);
        }
    }
}
