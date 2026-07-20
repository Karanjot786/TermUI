// ─────────────────────────────────────────────────────
// @termuijs/widgets — Card widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CardOptions {
    /** Optional title shown in the top border */
    title?: string;
    /** Color for the border and title */
    borderColor?: Color;
}

/**
 * Card — a bordered container with an optional title in the top border.
 *
 * Like a Box with border + padding, but supports embedding a title string
 * directly in the top border line.
 */
export class Card extends Widget {
    private _title: string;
    private _borderColor?: Color;

    constructor(style: Partial<Style> = {}, opts: CardOptions = {}) {
        super({
            border: 'single',
            padding: 1,
            ...style,
        });
        this._title = opts.title ?? '';
        this._borderColor = opts.borderColor;
    }

    setTitle(title: string): void {
        this._title = title;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._title) return;

        const { x, y, width } = this._rect;
        if (width < 4) return;

        const attrs = styleToCellAttrs(this._style);
        const fg = this._borderColor ?? attrs.fg;

        // Title rendered into top border: ─ Title ─
        const titleText = ` ${this._title} `;
        const titleWidth = stringWidth(titleText);
        const innerWidth = width - 2; // minus corners
        if (titleWidth > innerWidth) return;

        const titleX = x + 1 + Math.floor((innerWidth - titleWidth) / 2);
        screen.writeString(titleX, y, titleText, { fg, bold: true });
    }
}
