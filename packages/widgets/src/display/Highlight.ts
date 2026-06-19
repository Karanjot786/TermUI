import { type Style, parseColor, stringWidth } from '@termuijs/core';
import { Box } from './Box.js';
import { Text } from './Text.js';

const escapeRegExp = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DEFAULT_STYLE: Partial<Style> = {
    bg: parseColor('yellow'),
    fg: parseColor('black'),
};

export class Highlight extends Box {
    constructor(text: string, query: string | RegExp, style?: Partial<Style>) {
        super({ flexDirection: 'row' });
        this._buildSegments(text, query, style);
    }

    private _buildSegments(text: string, query: string | RegExp, highlightStyle?: Partial<Style>): void {
        const style = highlightStyle ?? DEFAULT_STYLE;

        if (!query) {
            this.addChild(new Text(text, { width: stringWidth(text), height: 1 }));
            return;
        }

        const pattern = query instanceof RegExp ? query.source : escapeRegExp(query);
        const baseFlags = query instanceof RegExp ? query.flags : 'i';
        const splitFlags = baseFlags.includes('g') ? baseFlags : `${baseFlags}g`;
        const splitRegex = new RegExp(`(${pattern})`, splitFlags);
        const matchRegex = new RegExp(`^(?:${pattern})$`, baseFlags.replace(/g/g, ''));

        for (const part of text.split(splitRegex)) {
            const partStyle = matchRegex.test(part) ? { ...style, width: stringWidth(part), height: 1 } : { width: stringWidth(part), height: 1 };
            this.addChild(new Text(part, partStyle));
        }
    }

    setText(text: string, query: string | RegExp, style?: Partial<Style>): void {
        this.clearChildren();
        this._buildSegments(text, query, style);
    }

    private _updateHighlight(text: string, query: string | RegExp, style?: Partial<Style>): void {
        this.setText(text, query, style);
    }

    /** @deprecated Use setText() instead. */
    update(text: string, query?: string | RegExp, style?: Partial<Style>): void;
    update<T = unknown>(_previousProps: T): void;
    update(text: unknown, query?: unknown, style?: unknown): void {
        if (typeof text === 'string') {
            const q = typeof query === 'string' || query instanceof RegExp ? query : '';
            const s = style === undefined || (typeof style === 'object' && style !== null && !Array.isArray(style))
                ? (style as Partial<Style> | undefined)
                : undefined;
            this._updateHighlight(text, q, s);
        }
    }
}
