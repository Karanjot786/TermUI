// ─────────────────────────────────────────────────────
// @termuijs/widgets — KeyValue widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, stringWidth, caps, type KeyEvent } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface KeyValuePair {
    key: string;
    // any is used because the value can be of completely arbitrary nested object structures or primitive types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
}

export interface KeyValueOptions {
    /** Separator between key and value (default: ': ') */
    separator?: string;
    /** Color for keys */
    keyColor?: import('@termuijs/core').Color;
    /** Color for values */
    valueColor?: import('@termuijs/core').Color;
}

/**
 * KeyValue — aligned key: value pairs.
 *
 * Keys are right-aligned to the width of the longest key.
 * Values follow after the separator.
 */
export class KeyValue extends Widget {
    private _pairs: KeyValuePair[];
    private _separator: string;
    private _keyColor?: import('@termuijs/core').Color;
    private _valueColor?: import('@termuijs/core').Color;

    private _expandedPaths = new Set<string>();
    private _selectedIndex = 0;

    constructor(
        // any is used because pairs can be objects with unknown/arbitrary arbitrary depth properties
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pairs: Array<KeyValuePair> | Record<string, any>,
        style: Partial<Style> = {},
        opts: KeyValueOptions = {},
    ) {
        super(style);
        this._pairs = Array.isArray(pairs)
            ? pairs
            : Object.entries(pairs).map(([key, value]) => ({ key, value }));
        this._separator = opts.separator ?? ': ';
        this._keyColor = opts.keyColor;
        this._valueColor = opts.valueColor;

        this._updateFocusable();
    }

    // any is used because pairs can be objects with unknown/arbitrary arbitrary depth properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPairs(pairs: Array<KeyValuePair> | Record<string, any>): void {
        this._pairs = Array.isArray(pairs)
            ? pairs
            : Object.entries(pairs).map(([key, value]) => ({ key, value }));
        this._updateFocusable();
        this.markDirty();
    }

    private _updateFocusable() {
        this.focusable = this._pairs.some(p => typeof p.value === 'object' && p.value !== null && !Array.isArray(p.value));
    }

    private _getVisibleRows() {
        const rows: { id: string; displayKey: string; valStr: string; isObj: boolean }[] = [];
        
        const traverse = (items: KeyValuePair[], depth: number, basePath: string) => {
            for (const item of items) {
                const isObj = typeof item.value === 'object' && item.value !== null && !Array.isArray(item.value);
                const id = basePath ? `${basePath}.${item.key}` : item.key;
                
                let prefix = '';
                if (isObj) {
                    prefix = this._expandedPaths.has(id) ? (caps.unicode ? '▼ ' : 'v ') : (caps.unicode ? '▶ ' : '> ');
                }
                
                const indent = '  '.repeat(depth);
                const displayKey = indent + prefix + item.key;
                
                let valStr = String(item.value);
                if (isObj) {
                    valStr = `[${Object.keys(item.value).length} keys]`;
                }
                
                rows.push({ id, displayKey, valStr, isObj });
                
                if (isObj && this._expandedPaths.has(id)) {
                    const children = Object.entries(item.value).map(([k, v]) => ({ key: k, value: v }));
                    traverse(children, depth + 1, id);
                }
            }
        };
        
        traverse(this._pairs, 0, '');
        return rows;
    }

    moveUp(): void {
        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        this.markDirty();
    }

    moveDown(): void {
        const rows = this._getVisibleRows();
        this._selectedIndex = Math.min(rows.length - 1, this._selectedIndex + 1);
        this.markDirty();
    }

    toggleSelected(): void {
        const rows = this._getVisibleRows();
        const row = rows[this._selectedIndex];
        if (row && row.isObj) {
            if (this._expandedPaths.has(row.id)) {
                this._expandedPaths.delete(row.id);
            } else {
                this._expandedPaths.add(row.id);
            }
            this.markDirty();
        }
    }

    handleKey(event: KeyEvent | string): void {
        const keyName = typeof event === 'string' ? event.toLowerCase() : event.key.toLowerCase();
        if (keyName === 'up' || keyName === 'k' || keyName === 'arrowup') {
            this.moveUp();
        } else if (keyName === 'down' || keyName === 'j' || keyName === 'arrowdown') {
            this.moveDown();
        } else if (keyName === 'enter' || keyName === ' ' || keyName === 'space') {
            this.toggleSelected();
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._pairs.length === 0) return;

        const rows = this._getVisibleRows();
        if (rows.length === 0) return;

        // Keep selection in bounds
        if (this._selectedIndex >= rows.length) {
            this._selectedIndex = Math.max(0, rows.length - 1);
        }

        const attrs = styleToCellAttrs(this._style);

        // Find max key width for alignment
        let maxKeyWidth = 0;
        for (const row of rows) {
            const w = stringWidth(row.displayKey);
            if (w > maxKeyWidth) maxKeyWidth = w;
        }

        const sepWidth = stringWidth(this._separator);

        // Calculate scroll offset to keep selected row in view
        let startIdx = 0;
        if (this._selectedIndex >= height) {
            startIdx = this._selectedIndex - height + 1;
        }

        for (let i = 0; i < height; i++) {
            const rowIdx = startIdx + i;
            const row = rows[rowIdx];
            if (!row) continue;

            const isSelected = this.isFocused && rowIdx === this._selectedIndex;

            const keyWidth = stringWidth(row.displayKey);
            const keyX = x + (maxKeyWidth - keyWidth); // right-align key
            const sepX = x + maxKeyWidth;
            const valX = sepX + sepWidth;
            const valWidth = Math.max(0, width - maxKeyWidth - sepWidth);

            // Highlight using dim/bold styles to keep minimalism without causing weird blockiness
            const displayFg = isSelected ? { type: 'named' as const, name: 'cyan' as const } : undefined;

            // Key
            screen.writeString(keyX, y + i, row.displayKey, {
                ...attrs,
                fg: displayFg ?? this._keyColor ?? attrs.fg,
                bold: isSelected || true,
            });

            // Separator
            screen.writeString(sepX, y + i, this._separator, { 
                ...attrs, 
                dim: true,
                fg: displayFg ?? attrs.fg
            });

            // Value
            if (valWidth > 0) {
                screen.writeString(valX, y + i, row.valStr.slice(0, valWidth), {
                    ...attrs,
                    fg: displayFg ?? this._valueColor ?? attrs.fg,
                    dim: row.isObj && !isSelected
                });
            }
        }
    }
}
