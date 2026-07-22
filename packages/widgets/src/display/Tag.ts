// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tag widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, stringWidth, caps, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type TagVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export interface TagOptions {
    /** Variant determines border and text color. Default: 'neutral'. */
    variant?: TagVariant;
}

/** Foreground colors for each variant (used for border + text). */
const FG_COLORS: Record<TagVariant, Color> = {
    info:    { type: 'named', name: 'cyan' },
    success: { type: 'named', name: 'green' },
    warning: { type: 'named', name: 'yellow' },
    error:   { type: 'named', name: 'red' },
    neutral: { type: 'named', name: 'white' },
};

/**
 * Tag — a short inline label with a colored border and no background fill.
 *
 * Used for categorical labels such as "typescript", "react", "v2.0".
 * Renders a bordered box with the text colored by variant but no background.
 * Uses `caps.unicode` to choose between Unicode box-drawing and ASCII fallback.
 *
 * CONSTRUCTOR: (text, style?, opts?)
 */
export class Tag extends Widget {
    private _text: string;
    private _variant: TagVariant;

    constructor(text: string, style?: Partial<Style>, opts?: TagOptions) {
        super(style ?? {});
        this._text = text;
        this._variant = opts?.variant ?? 'neutral';
    }

    /** Update the tag text. */
    setText(text: string): void {
        if (text === this._text) return;

        this._text = text;
        this.markDirty();
    }

    /** Get the current tag text. */
    getText(): string {
        return this._text;
    }

    /** Update the tag variant. */
    setVariant(variant: TagVariant): void {
        if (variant === this._variant) return;

        this._variant = variant;
        this.markDirty();
    }

    /** Get the current tag variant. */
    getVariant(): TagVariant {
        return this._variant;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const fg = FG_COLORS[this._variant];

        // Choose border characters based on unicode support
        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';
        const hz = caps.unicode ? '─' : '-';
        const vt = caps.unicode ? '│' : '|';

        const borderAttrs = { fg };
        const textAttrs = { fg };

        // Padded text: " text "
        const padded = ` ${this._text} `;
        const textWidth = stringWidth(padded);

        // Inner width is the area between left and right border
        const innerWidth = Math.min(textWidth, Math.max(0, width - 2));

        // ── Row 0: top border ──
        if (height >= 1) {
            screen.setCell(x, y, { char: tl, ...borderAttrs });
            for (let c = 1; c <= innerWidth; c++) {
                screen.setCell(x + c, y, { char: hz, ...borderAttrs });
            }
            if (innerWidth + 1 < width) {
                screen.setCell(x + innerWidth + 1, y, { char: tr, ...borderAttrs });
            }
        }

        // ── Row 1: content row (no background fill) ──
        if (height >= 2) {
            screen.setCell(x, y + 1, { char: vt, ...borderAttrs });

            // Write padded text with variant foreground, no background
            const visibleText = truncate(padded, innerWidth, '');
            screen.writeString(x + 1, y + 1, visibleText, textAttrs);

            if (innerWidth + 1 < width) {
                screen.setCell(x + innerWidth + 1, y + 1, { char: vt, ...borderAttrs });
            }
        }

        // ── Row 2: bottom border ──
        if (height >= 3) {
            screen.setCell(x, y + 2, { char: bl, ...borderAttrs });
            for (let c = 1; c <= innerWidth; c++) {
                screen.setCell(x + c, y + 2, { char: hz, ...borderAttrs });
            }
            if (innerWidth + 1 < width) {
                screen.setCell(x + innerWidth + 1, y + 2, { char: br, ...borderAttrs });
            }
        }
    }
}
