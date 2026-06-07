// ─────────────────────────────────────────────────────
// @termuijs/widgets — DiffView widget (unified diff viewer)
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    styleToCellAttrs,
    stringWidth,
    truncate,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface DiffLine {
    type: 'add' | 'remove' | 'context';
    content: string;
    lineNo?: number; // optional line number to show in gutter
}

export interface DiffViewOptions {
    lines: DiffLine[];
    showLineNumbers?: boolean; // default: true
    gutterWidth?: number;      // default: 5 (e.g. " 123 ")
}

/**
 * DiffView — a scrollable unified diff viewer with +/- line coloring.
 *
 * Supports:
 * - Gutter with optional right-aligned line numbers (dim)
 * - '+' prefix for added lines (green fg)
 * - '-' prefix for removed lines (red fg)
 * - ' ' prefix for context lines (dim fg)
 * - Keyboard scrolling: ArrowUp/Down, j/k, PageUp/PageDown, Home/End
 */
export class DiffView extends Widget {
    private _lines: DiffLine[];
    private _scrollOffset = 0;
    private _showLineNumbers: boolean;
    private _gutterWidth: number;

    constructor(options: DiffViewOptions, style: Partial<Style> = {}) {
        super(style);
        this._lines = options.lines;
        this._showLineNumbers = options.showLineNumbers ?? true;
        this._gutterWidth = options.gutterWidth ?? 5;
        this.focusable = true;
    }

    setLines(lines: DiffLine[]): void {
        this._lines = lines;
        this._scrollOffset = 0;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const baseAttrs = styleToCellAttrs(this._style);
        const visibleLines = this._lines.slice(
            this._scrollOffset,
            this._scrollOffset + height,
        );

        for (let i = 0; i < visibleLines.length; i++) {
            const diffLine = visibleLines[i];
            let col = x;
            const row = y + i;

            // ── Determine color by type ────────────────────────
            const isAdd = diffLine.type === 'add';
            const isRemove = diffLine.type === 'remove';
            const isContext = diffLine.type === 'context';

            const fg = isAdd
                ? { type: 'named' as const, name: 'green' as const }
                : isRemove
                    ? { type: 'named' as const, name: 'red' as const }
                    : undefined;

            const lineAttrs = {
                ...baseAttrs,
                ...(fg ? { fg } : {}),
                dim: isContext,
            };

            // ── Gutter ─────────────────────────────────────────
            if (this._showLineNumbers) {
                const gutterStr =
                    diffLine.lineNo !== undefined
                        ? String(diffLine.lineNo).padStart(this._gutterWidth - 1, ' ') + ' '
                        : ' '.repeat(this._gutterWidth);

                const gutterAttrs = { ...baseAttrs, dim: true };
                screen.writeString(col, row, gutterStr.slice(0, this._gutterWidth), gutterAttrs);
                col += this._gutterWidth;
            }

            // ── Prefix character ───────────────────────────────
            const prefix = isAdd ? '+' : isRemove ? '-' : ' ';
            const remainingWidth = width - (col - x);
            if (remainingWidth <= 0) continue;

            screen.writeString(col, row, prefix, lineAttrs);
            col += 1;

            // ── Content ────────────────────────────────────────
            const contentWidth = width - (col - x);
            if (contentWidth <= 0) continue;

            const content = truncate(diffLine.content, contentWidth);
            screen.writeString(col, row, content, lineAttrs);
        }
    }

    handleKey(key: string): void {
        const rect = this._getContentRect();
        const visibleHeight = Math.max(1, rect.height);
        const maxOffset = Math.max(0, this._lines.length - visibleHeight);

        switch (key) {
            case 'up':
            case 'k':
                this._scrollOffset = Math.max(0, this._scrollOffset - 1);
                this.markDirty();
                break;

            case 'down':
            case 'j':
                this._scrollOffset = Math.min(maxOffset, this._scrollOffset + 1);
                this.markDirty();
                break;

            case 'pageup':
                this._scrollOffset = Math.max(0, this._scrollOffset - visibleHeight);
                this.markDirty();
                break;

            case 'pagedown':
                this._scrollOffset = Math.min(maxOffset, this._scrollOffset + visibleHeight);
                this.markDirty();
                break;

            case 'home':
                this._scrollOffset = 0;
                this.markDirty();
                break;

            case 'end':
                this._scrollOffset = maxOffset;
                this.markDirty();
                break;
        }
    }
}
