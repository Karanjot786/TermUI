// ─────────────────────────────────────────────────────
// @termuijs/widgets — Text widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, wordWrap, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface TextProps {
    content: string;
    wrap?: boolean;
    align?: 'left' | 'center' | 'right';
    /** Vertical scroll offset (lines to skip from top). Default: 0. */
    scrollY?: number;
    /** Horizontal scroll offset (columns to skip from left). Default: 0. */
    scrollX?: number;
}

/**
 * Text — renders a string of text with word-wrapping, alignment, and scrolling.
 */
export class Text extends Widget {
    private _content: string;
    private _wrap: boolean;
    private _align: 'left' | 'center' | 'right';
    private _scrollY: number;
    private _scrollX: number;

    constructor(content: string, style: Partial<Style> = {}, props: Partial<TextProps> = {}) {
        super(style);
        this._content = content;
        this._wrap = props.wrap ?? true;
        this._align = props.align ?? 'left';
        this._scrollY = props.scrollY ?? 0;
        this._scrollX = props.scrollX ?? 0;
    }

    /** Update the text content */
    setContent(content: string): void {
        this._content = content;
        this.markDirty();
    }

    /** Get current text content */
    getContent(): string {
        return this._content;
    }

    /** Set vertical scroll offset (lines to skip). */
    setScrollY(offset: number): void {
        this._scrollY = Math.max(0, offset);
        this.markDirty();
    }

    /** Set horizontal scroll offset (columns to skip). */
    setScrollX(offset: number): void {
        this._scrollX = Math.max(0, offset);
        this.markDirty();
    }

    /** Get the total number of lines after wrapping. */
    getLineCount(): number {
        const contentRect = this._getContentRect();
        const text = this._wrap ? wordWrap(this._content, contentRect.width) : this._content;
        return text.split('\n').length;
    }

    protected _renderSelf(screen: Screen): void {
        const contentRect = this._getContentRect();
        const { x, y, width, height } = contentRect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Word-wrap if enabled
        let text = this._wrap ? wordWrap(this._content, width) : this._content;
        const allLines = text.split('\n');

        // Apply vertical scroll
        const startLine = Math.min(this._scrollY, allLines.length);
        const visibleLines = allLines.slice(startLine, startLine + height);

        for (let i = 0; i < Math.min(visibleLines.length, height); i++) {
            let line = visibleLines[i];
            if (line === undefined) continue;

            // Apply horizontal scroll
            if (this._scrollX > 0) {
                // Skip scrollX characters
                let skipped = 0;
                let charIndex = 0;
                for (const ch of line) {
                    if (skipped >= this._scrollX) break;
                    skipped++;
                    charIndex += ch.length;
                }
                line = line.slice(charIndex);
            }

            const lineWidth = stringWidth(line);

            // Apply alignment
            let offsetX = 0;
            if (this._align === 'center') {
                offsetX = Math.floor((width - lineWidth) / 2);
            } else if (this._align === 'right') {
                offsetX = width - lineWidth;
            }

            screen.writeString(x + Math.max(0, offsetX), y + i, line, attrs);
        }
    }
}

