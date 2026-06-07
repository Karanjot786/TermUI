// ─────────────────────────────────────────────────────
// @termuijs/widgets — Badge widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type BadgeVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export interface BadgeOptions {
    /** Variant determines background color. Default: 'neutral'. */
    variant?: BadgeVariant;
}

/** Background colors for each variant. */
const BG_COLORS: Record<BadgeVariant, Color> = {
    info:    { type: 'named', name: 'cyan' },
    success: { type: 'named', name: 'green' },
    warning: { type: 'named', name: 'yellow' },
    error:   { type: 'named', name: 'red' },
    neutral: { type: 'named', name: 'white' },
};

/** Foreground color — black for readability on colored backgrounds. */
const FG_COLOR: Color = { type: 'named', name: 'black' };

/**
 * Badge — a short inline label with a colored background.
 *
 * Used for status indicators such as "online", "error", "beta".
 * Renders a bordered box with the text on a colored background.
 * Uses `caps.unicode` to choose between Unicode box-drawing and ASCII fallback.
 *
 * CONSTRUCTOR (canonical): (text, style?, opts?)
 * @deprecated Badge(text, opts, style) is deprecated. Use Badge(text, style, opts) instead.
 */
export class Badge extends Widget {
    private _text: string;
    private _variant: BadgeVariant;

    constructor(text: string, style?: Partial<Style>, opts?: BadgeOptions);
    /** @deprecated Use Badge(text, style?, opts?) instead */
    constructor(text: string, opts: BadgeOptions, style?: Partial<Style>);
    constructor(text: string, styleOrOpts?: Partial<Style> | BadgeOptions, optsOrStyle?: BadgeOptions | Partial<Style>) {
        // Detect old deprecated signature: Badge(text, opts, style)
        if (styleOrOpts && 'variant' in styleOrOpts) {
            console.warn('Badge(text, opts, style) is deprecated. Use Badge(text, style, opts) instead.');
            const opts = styleOrOpts as BadgeOptions;
            const style = optsOrStyle as Partial<Style> | undefined;
            super(style ?? {});
            this._text = text;
            this._variant = opts.variant ?? 'neutral';
        } else {
            const style = styleOrOpts as Partial<Style> | undefined;
            const opts = optsOrStyle as BadgeOptions | undefined;
            super(style ?? {});
            this._text = text;
            this._variant = opts?.variant ?? 'neutral';
        }
    }

    /** Update the badge text. */
    setText(text: string): void {
        this._text = text;
        this.markDirty();
    }

    /** Get the current badge text. */
    getText(): string {
        return this._text;
    }

    /** Update the badge variant. */
    setVariant(variant: BadgeVariant): void {
        this._variant = variant;
        this.markDirty();
    }

    /** Get the current badge variant. */
    getVariant(): BadgeVariant {
        return this._variant;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const bg = BG_COLORS[this._variant];
        const fg = FG_COLOR;

        // Choose border characters based on unicode support
        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';
        const hz = caps.unicode ? '─' : '-';
        const vt = caps.unicode ? '│' : '|';

        const borderAttrs = { fg: bg };
        const contentAttrs = { fg, bg, bold: true };

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

        // ── Row 1: content row ──
        if (height >= 2) {
            screen.setCell(x, y + 1, { char: vt, ...borderAttrs });

            // Write padded text with colored background
            const visibleText = padded.slice(0, innerWidth);
            screen.writeString(x + 1, y + 1, visibleText, contentAttrs);

            // Fill remaining inner space with background
            const written = stringWidth(visibleText);
            for (let c = written; c < innerWidth; c++) {
                screen.setCell(x + 1 + c, y + 1, { char: ' ', ...contentAttrs });
            }

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
