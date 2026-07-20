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
    /**
     * If true, ANSI escape sequences in content are rendered as-is.
     * Only SGR formatting is preserved — cursor movement, screen clears,
     * and OSC sequences are still stripped for safety.
     * Use only for trusted formatted content (e.g., log output).
     */
    raw?: boolean;
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
    private _raw: boolean;

    constructor(content: string, style: Partial<Style> = {}, props: Partial<TextProps> = {}) {
        super(style);
        this._content = content;
        this._wrap = props.wrap ?? true;
        this._align = props.align ?? 'left';
        this._scrollY = props.scrollY ?? 0;
        this._scrollX = props.scrollX ?? 0;
        this._raw = props.raw ?? false;
        // When raw mode is enabled, bypass sanitization (trusted formatted content)
        this.sanitizeContent = !this._raw;
    }

    /** Update the text content */
    setContent(content: string): void {
        if (content === this._content) {
            return;
        }
        this._content = content;
        this.markDirty();
    }

    /** Get current text content */
    getContent(): string {
        return this._content;
    }

    toString(): string {
        return this._content;
    }

    /** Set vertical scroll offset (lines to skip). */
    setScrollY(offset: number): void {
        const normalized = Math.max(0, offset);
        if (normalized === this._scrollY) {
            return;
        }
        this._scrollY = normalized;
        this.markDirty();
    }

    /** Set horizontal scroll offset (columns to skip). */
    setScrollX(offset: number): void {
        const normalized = Math.max(0, offset);
        if (normalized === this._scrollX) {
            return;
        }
        this._scrollX = normalized;
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

        // Sanitize content to prevent ANSI escape injection
        const content = this.sanitize(this._content);

        // Word-wrap if enabled
        let text = this._wrap ? wordWrap(content, width) : content;
        const allLines = text.split('\n');

        // Apply vertical scroll
        const startLine = Math.min(this._scrollY, Math.max(0, allLines.length - 1));
        const visibleLines = allLines.slice(startLine, startLine + height);

        for (let i = 0; i < Math.min(visibleLines.length, height); i++) {
            let line = visibleLines[i];
            if (line === undefined) continue;

            // Apply horizontal scroll
            if (this._scrollX > 0) {
                // Skip scrollX visual columns
                let skipped = 0;
                let charIndex = 0;
                let lineRebuilt = false;
                for (const ch of line) {
                    const charWidth = stringWidth(ch);
                    if (skipped + charWidth > this._scrollX) {
                        // scrollX lands in the middle of this character
                        // For wide characters, we need to handle the partial column
                        if (charWidth > 1 && skipped < this._scrollX) {
                            // We're in the middle of a wide character
                            // Calculate how many columns of this character are visible
                            const visibleColumns = this._scrollX - skipped;
                            const remainingColumns = charWidth - visibleColumns;
                            // Add placeholders for the visible columns that were skipped
                            line = ' '.repeat(visibleColumns) + line.slice(charIndex + ch.length);
                            lineRebuilt = true;
                        }
                        break;
                    }
                    skipped += charWidth;
                    charIndex += ch.length;
                }
                if (!lineRebuilt) {
                    line = line.slice(charIndex);
                }
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

