// ─────────────────────────────────────────────────────
// @termuijs/widgets — Rule widget (horizontal / vertical divider)
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, caps, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type RuleOrientation = 'horizontal' | 'vertical';

export interface RuleOptions {
    /** Line direction. Default: 'horizontal'. */
    orientation?: RuleOrientation;
    /** Title centered in the line (horizontal only). */
    title?: string;
    /** Line color. Default: brightBlack */
    color?: Color;
}

/** Default line color used when no color option is provided. */
const DEFAULT_COLOR: Color = { type: 'named', name: 'brightBlack' };

/**
 * Rule — a horizontal or vertical divider line with an optional centered title.
 *
 * Horizontal example (no title):
 *   ────────────────────
 *
 * Horizontal example (with title):
 *   ────── Logs ──────
 *
 * Vertical example:
 *   │
 *   │
 *   │
 *
 * Uses `caps.unicode` to choose between Unicode box-drawing and ASCII fallback.
 */
export class Rule extends Widget {
    private _orientation: RuleOrientation;
    private _title: string | undefined;
    private _color: Color;

    constructor(style: Partial<Style> = {}, opts: RuleOptions = {}) {
        super(style);
        this._orientation = opts.orientation ?? 'horizontal';
        this._title = opts.title;
        this._color = opts.color ?? DEFAULT_COLOR;
    }

    /** Update the title text. Calls markDirty(). */
    setTitle(title: string): void {
        if (title === this._title) {
            return;
        }
        this._title = title;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) {
            return;
        }
        const fg = this._color;
        const lineAttrs = { fg };

        if (this._orientation === 'vertical') {
            const vt = caps.unicode ? '│' : '|';
            for (let r = 0; r < height; r++) {
                screen.setCell(x, y + r, { char: vt, ...lineAttrs });
            }
            return;
        }

        // ── Horizontal ──
        const hz = caps.unicode ? '─' : '-';

        if (!this._title) {
            // No title — fill entire width with the line glyph
            for (let c = 0; c < width; c++) {
                screen.setCell(x + c, y, { char: hz, ...lineAttrs });
            }
            return;
        }

        // Title present — center it with a space on each side: " Title "
        const padded = ` ${this._title} `;
        const titleWidth = stringWidth(padded);

        if (titleWidth >= width) {
            // Title is too wide to leave room for line glyphs — just render it
            screen.writeString(x, y, padded.slice(0, width), lineAttrs);
            return;
        }

        const leftLen = Math.floor((width - titleWidth) / 2);
        const rightLen = width - leftLen - titleWidth;

        // Left line segment
        for (let c = 0; c < leftLen; c++) {
            screen.setCell(x + c, y, { char: hz, ...lineAttrs });
        }

        // Centered title
        screen.writeString(x + leftLen, y, padded, lineAttrs);

        // Right line segment
        const rightStart = leftLen + titleWidth;
        for (let c = 0; c < rightLen; c++) {
            screen.setCell(x + rightStart + c, y, { char: hz, ...lineAttrs });
        }
    }
}
