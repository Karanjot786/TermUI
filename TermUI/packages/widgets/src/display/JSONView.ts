// ─────────────────────────────────────────────────────
// @termuijs/widgets — JSONView widget (syntax-colored JSON tree)
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type Color,
    styleToCellAttrs,
    truncate,
    stringWidth,
    caps,
} from '@termuijs/core';
import { Tree, type TreeNode } from './Tree.js';

// ── Type metadata stored in node.data ─────────────────

export type JSONNodeType =
    | 'null'
    | 'boolean'
    | 'number'
    | 'string'
    | 'array'
    | 'object'
    | 'unknown';

export interface JSONNodeData {
    type: JSONNodeType;
    /** Original key (if any) that prefixes the label */
    key?: string;
    /** Raw primitive value (for non-container nodes) */
    value?: unknown;
}

// ── Options ───────────────────────────────────────────

export interface JSONViewOptions {
    /** The JSON value to display */
    data: unknown;
    /** Callback when a leaf node is selected */
    onSelect?: (node: TreeNode, path: number[]) => void;
    /** Spaces per indent level (default: 2) */
    indent?: number;
}

// ── jsonToTree() helper ────────────────────────────────

/**
 * Convert any JSON-compatible value to a TreeNode, optionally prefixed
 * by `key` (the property name or array index in the parent container).
 */
export function jsonToTree(value: unknown, key?: string): TreeNode {
    const prefix = key !== undefined ? `${key}: ` : '';

    if (value === null) {
        return {
            label: `${prefix}null`,
            data: { type: 'null', key } satisfies JSONNodeData,
        };
    }

    if (typeof value === 'boolean') {
        return {
            label: `${prefix}${value}`,
            data: { type: 'boolean', key, value } satisfies JSONNodeData,
        };
    }

    if (typeof value === 'number') {
        return {
            label: `${prefix}${value}`,
            data: { type: 'number', key, value } satisfies JSONNodeData,
        };
    }

    if (typeof value === 'string') {
        return {
            label: `${prefix}"${value}"`,
            data: { type: 'string', key, value } satisfies JSONNodeData,
        };
    }

    if (Array.isArray(value)) {
        const children = value.map((v, i) => jsonToTree(v, String(i)));
        return {
            label: `${prefix}[${children.length}]`,
            children,
            expanded: false,
            data: { type: 'array', key } satisfies JSONNodeData,
        };
    }

    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const children = Object.keys(obj).map(k => jsonToTree(obj[k], k));
        return {
            label: `${prefix}{${children.length}}`,
            children,
            expanded: false,
            data: { type: 'object', key } satisfies JSONNodeData,
        };
    }

    return {
        label: `${prefix}${String(value)}`,
        data: { type: 'unknown', key } satisfies JSONNodeData,
    };
}

// ── Color helpers ──────────────────────────────────────

/** Pick the foreground color for the value part based on JSON type. */
function _valueColor(type: JSONNodeType): Color {
    switch (type) {
        case 'string':  return { type: 'named', name: 'green' };
        case 'number':  return { type: 'named', name: 'yellow' };
        case 'boolean': return { type: 'named', name: 'magenta' };
        case 'null':    return { type: 'named', name: 'magenta' };
        default:        return { type: 'named', name: 'white' };
    }
}

const KEY_COLOR: Color = { type: 'named', name: 'cyan' };

/**
 * Split a label produced by jsonToTree into its key prefix and value parts.
 * e.g. `"name: \"Alice\""` → `{ keyPart: "name: ", valuePart: "\"Alice\"" }`
 * e.g. `"null"`            → `{ keyPart: "", valuePart: "null" }`
 */
function _splitLabel(label: string, nodeData: JSONNodeData): { keyPart: string; valuePart: string } {
    if (nodeData.key !== undefined) {
        const sep = `${nodeData.key}: `;
        if (label.startsWith(sep)) {
            return { keyPart: sep, valuePart: label.slice(sep.length) };
        }
    }
    return { keyPart: '', valuePart: label };
}

// ── JSONView ───────────────────────────────────────────

/**
 * JSONView — a syntax-colored, collapsible JSON viewer.
 *
 * Extends `Tree` and overrides `_renderSelf` to colorize each row:
 * - Key portion (the `"key: "` prefix) is rendered in cyan
 * - Value portion is colored by JSON type:
 *   - string  → green
 *   - number  → yellow
 *   - boolean / null → magenta
 *   - object `{n}` / array `[n]` → white (default)
 *
 * Usage:
 * ```ts
 * const view = new JSONView({ data: { name: 'Alice', age: 30 } });
 * view.updateRect({ x: 0, y: 0, width: 60, height: 20 });
 * view.render(screen);
 * ```
 */
export class JSONView extends Tree {
    constructor(options: JSONViewOptions, style: Partial<Style> = {}) {
        const root = jsonToTree(options.data);
        // If the root is a container, use its children as top-level nodes;
        // otherwise wrap the single node in an array.
        const nodes = root.children && root.children.length > 0 ? root.children : [root];
        super({ nodes, onSelect: options.onSelect, indent: options.indent }, style);
    }

    // ── Override rendering ─────────────────────────────

    /**
     * Replicate Tree's _renderSelf but colorize key/value segments.
     * We access the private state via `(this as any)` since Tree doesn't
     * expose those fields publicly — the tradeoff of extending vs composing.
     */
    protected override _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const useUnicode = caps.unicode;

        const collapsedChevron = useUnicode ? '▶ ' : '> ';
        const expandedChevron  = useUnicode ? '▼ ' : 'v ';
        const leafPrefix       = useUnicode ? '• ' : '* ';

        // Access Tree's protected fields directly
        const visibleNodes = this._visibleNodes;
        const scrollOffset = this._scrollOffset;
        const selectedIndex = this._selectedIndex;
        const indent = this._indent;

        const visibleCount = Math.min(
            visibleNodes.length - scrollOffset,
            height,
        );

        for (let i = 0; i < visibleCount; i++) {
            const entryIdx = scrollOffset + i;
            const entry = visibleNodes[entryIdx];
            const { node, depth } = entry;
            const isSelected = entryIdx === selectedIndex;
            const nodeData = (node.data ?? { type: 'unknown' }) as JSONNodeData;

            // Build the prefix (indent + chevron/bullet)
            const indentStr = ' '.repeat(indent * depth);
            const isParent = Array.isArray(node.children) && node.children.length > 0;
            let chevron: string;
            if (isParent) {
                chevron = node.expanded ? expandedChevron : collapsedChevron;
            } else {
                chevron = leafPrefix;
            }
            const linePrefix = indentStr + chevron;

            // Split label into key part and value part for colorization
            const { keyPart, valuePart } = _splitLabel(node.label, nodeData);

            // Base cell attrs (selection highlight)
            const baseCellStyle = isSelected && this.isFocused
                ? {
                    ...attrs,
                    bg: { type: 'named' as const, name: 'blue' as const },
                    bold: true,
                }
                : isSelected
                    ? { ...attrs, bold: true }
                    : attrs;

            // Write the prefix (indent + chevron) in base style
            let cursorX = x;
            const prefixTrunc = truncate(linePrefix, width);
            if (prefixTrunc.length > 0) {
                screen.writeString(cursorX, y + i, prefixTrunc, baseCellStyle);
                cursorX += stringWidth(prefixTrunc);
            }

            const remaining = width - (cursorX - x);
            if (remaining <= 0) {
                _fillSelection(screen, x, y + i, width, cursorX - x, isSelected, this.isFocused, baseCellStyle);
                continue;
            }

            // Write key part in cyan
            if (keyPart.length > 0) {
                const keyTrunc = truncate(keyPart, remaining);
                const keyStyle = { ...baseCellStyle, fg: KEY_COLOR };
                screen.writeString(cursorX, y + i, keyTrunc, keyStyle);
                cursorX += stringWidth(keyTrunc);
            }

            const remaining2 = width - (cursorX - x);
            if (remaining2 <= 0) {
                _fillSelection(screen, x, y + i, width, cursorX - x, isSelected, this.isFocused, baseCellStyle);
                continue;
            }

            // Write value part colored by JSON type
            if (valuePart.length > 0) {
                const valTrunc = truncate(valuePart, remaining2);
                const valColor = _valueColor(nodeData.type);
                const valStyle = { ...baseCellStyle, fg: valColor };
                screen.writeString(cursorX, y + i, valTrunc, valStyle);
                cursorX += stringWidth(valTrunc);
            }

            // Fill remainder of row for selection highlight background
            _fillSelection(screen, x, y + i, width, cursorX - x, isSelected, this.isFocused, baseCellStyle);
        }
    }
}

// ── Module-level render helpers ────────────────────────

/** Fill trailing cells on a selected+focused row for solid highlight background. */
function _fillSelection(
    screen: Screen,
    rowX: number,
    rowY: number,
    width: number,
    writtenWidth: number,
    isSelected: boolean,
    isFocused: boolean,
    cellStyle: Record<string, unknown>,
): void {
    if (!isSelected || !isFocused) return;
    const remaining = width - writtenWidth;
    for (let c = 0; c < remaining; c++) {
        screen.setCell(rowX + writtenWidth + c, rowY, {
            char: ' ',
            ...cellStyle,
        });
    }
}
