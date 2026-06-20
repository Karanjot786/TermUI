// ─────────────────────────────────────────────────────
// @termuijs/widgets — Definition widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, stringWidth, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface DefinitionPair {
    term: string;
    definition: string;
}

export interface DefinitionOptions {
    /** Indentation for definition lines (default: 2) */
    indent?: number;
    /** Blank line between pairs (default: true) */
    spacing?: boolean;
    /** Color for term labels */
    termColor?: import('@termuijs/core').Color;
    /** Color for definition text */
    definitionColor?: import('@termuijs/core').Color;
}

/**
 * Definition — term + definition pairs, stacked vertically.
 *
 * Each pair renders as:
 *   Term
 *     definition text (indented)
 *
 * Similar to KeyValue but stacked rather than inline.
 */
export class Definition extends Widget {
    private _pairs: DefinitionPair[];
    private _indent: number;
    private _spacing: boolean;
    private _termColor?: import('@termuijs/core').Color;
    private _definitionColor?: import('@termuijs/core').Color;

    constructor(
        pairs: DefinitionPair[] | Record<string, string>,
        style: Partial<Style> = {},
        opts: DefinitionOptions = {},
    ) {
        super(style);
        this._pairs = Array.isArray(pairs)
            ? pairs
            : Object.entries(pairs).map(([term, definition]) => ({ term, definition }));
        this._indent = opts.indent ?? 2;
        this._spacing = opts.spacing ?? true;
        this._termColor = opts.termColor;
        this._definitionColor = opts.definitionColor;
    }

    setPairs(pairs: DefinitionPair[] | Record<string, string>): void {
        this._pairs = Array.isArray(pairs)
            ? pairs
            : Object.entries(pairs).map(([term, definition]) => ({ term, definition }));
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._pairs.length === 0) return;

        const attrs = styleToCellAttrs(this._style);
        const indent = Math.min(this._indent, width - 1);

        let row = 0;

        for (const pair of this._pairs) {
            if (row >= height) break;

            // Term (bold)
            screen.writeString(x, y + row, truncate(pair.term, width, ''), {
                ...attrs,
                fg: this._termColor ?? attrs.fg,
                bold: true,
            });
            row++;

            if (row >= height) break;

            // Definition (indented, may span multiple lines via simple wrapping)
            const defWidth = Math.max(1, width - indent);
            const words = pair.definition.split(' ');
            let line = '';
            let lineWidth = 0;

            for (const word of words) {
                const wordWidth = stringWidth(word);
                if (lineWidth === 0) {
                    line = word;
                    lineWidth = wordWidth;
                } else if (lineWidth + 1 + wordWidth <= defWidth) {
                    line += ' ' + word;
                    lineWidth += 1 + wordWidth;
                } else {
                    if (row >= height) break;
                    screen.writeString(x + indent, y + row, line, {
                        ...attrs,
                        fg: this._definitionColor ?? attrs.fg,
                    });
                    row++;
                    line = word;
                    lineWidth = wordWidth;
                }
            }

            if (line && row < height) {
                screen.writeString(x + indent, y + row, line, {
                    ...attrs,
                    fg: this._definitionColor ?? attrs.fg,
                });
                row++;
            }

            // Blank line between pairs
            if (this._spacing && row < height) {
                row++;
            }
        }
    }
}
