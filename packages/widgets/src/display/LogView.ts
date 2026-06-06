// ─────────────────────────────────────────────────────
// @termuijs/widgets — LogView widget (scrollable log)
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface LogViewOptions {
    /** Highlight rules: keyword → color */
    highlight?: Record<string, Color>;
    /** Auto-scroll to bottom */
    autoScroll?: boolean;
}

/**
 * LogView — scrollable, highlighted log output.
 *
 * Supports keyword-based color highlighting (ERROR → red, WARN → yellow, etc.)
 */
export class LogView extends Widget {
    private _lines: string[] = [];
    private _scrollOffset = 0;
    private _highlight: Record<string, Color>;
    private _autoScroll: boolean;

    constructor(style: Partial<Style> = {}, opts: LogViewOptions = {}) {
        super(style);
        this._highlight = opts.highlight ?? {
            ERROR: { type: 'named', name: 'red' },
            WARN: { type: 'named', name: 'yellow' },
            INFO: { type: 'named', name: 'green' },
            DEBUG: { type: 'named', name: 'brightBlack' },
        };
        this._autoScroll = opts.autoScroll ?? true;
    }

    setLines(lines: string[]): void {
        this._lines = lines;
        if (this._autoScroll) {
            this._scrollToBottom();
        }
        this.markDirty();
    }

    appendLine(line: string): void {
        this._lines.push(line);
        if (this._autoScroll) {
            this._scrollToBottom();
        }
        this.markDirty();
    }

    scrollUp(n = 1): void {
        this._scrollOffset = Math.max(0, this._scrollOffset - n);
        this.markDirty();
    }

    scrollDown(n = 1): void {
        const rect = this._getContentRect();
        const visibleLines = Math.max(1, rect.height);
        const maxScroll = Math.max(0, this._lines.length - visibleLines);
        this._scrollOffset = Math.min(
            maxScroll,
            this._scrollOffset + n,
        );
        this.markDirty();
    }

    private _scrollToBottom(): void {
        const rect = this._getContentRect();
        const visibleLines = Math.max(1, rect.height);
        this._scrollOffset = Math.max(0, this._lines.length - visibleLines);
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const visibleLines = this._lines.slice(this._scrollOffset, this._scrollOffset + height);

        for (let i = 0; i < Math.min(visibleLines.length, height); i++) {
            const line = truncate(visibleLines[i], width);
            const lineColor = this._getLineColor(line);

            screen.writeString(x, y + i, line, {
                ...attrs,
                ...(lineColor ? { fg: lineColor } : {}),
            });
        }
    }

    private _getLineColor(line: string): Color | null {
        for (const [keyword, color] of Object.entries(this._highlight)) {
            if (line.includes(keyword)) return color;
        }
        return null;
    }
}
