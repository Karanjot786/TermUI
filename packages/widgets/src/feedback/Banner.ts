// ─────────────────────────────────────────────────────
// @termuijs/widgets — Banner widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, getBorderChars, normalizeEdges } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { type StatusVariant } from './StatusMessage.js';

export interface BannerOptions {
    /** Variant determines border color */
    variant?: StatusVariant;
    /** Title displayed on first line in bold */
    title?: string;
    /** Body text */
    body?: string;
}

const VARIANT_COLORS: Record<StatusVariant, Color> = {
    success: { type: 'named', name: 'green' },
    error:   { type: 'named', name: 'red' },
    warning: { type: 'named', name: 'yellow' },
    info:    { type: 'named', name: 'cyan' },
};

/**
 * Banner — full-width alert with title and body text.
 *
 * Shows a bordered box with a bold title line and body text,
 * colored according to variant. The border is drawn manually
 * to use the variant color.
 */
export class Banner extends Widget {
    private _variant: StatusVariant;
    private _title: string;
    private _body: string;

    constructor(style: Partial<Style> = {}, opts: BannerOptions = {}) {
        // Do NOT set border in style — we render it manually for color control
        super({
            width: '100%',
            padding: 1,
            ...style,
        });
        this._variant = opts.variant ?? 'info';
        this._title = opts.title ?? '';
        this._body = opts.body ?? '';
    }

    setTitle(title: string): void {
        if (this._title === title) return;

        this._title = title;
        this.markDirty();
    }

    setBody(body: string): void {
        if (this._body === body) return;

        this._body = body;
        this.markDirty();
    }

    setVariant(variant: StatusVariant): void {
        if (this._variant === variant) return;
        
        this._variant = variant;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width < 2 || height < 2) return;

        const attrs = styleToCellAttrs(this._style);
        const color = VARIANT_COLORS[this._variant];
        const fg = color;

        // Draw border manually in variant color
        const borderChars = getBorderChars('single');
        if (borderChars) {
            // Top edge
            screen.setCell(x, y, { char: borderChars.topLeft, fg });
            for (let c = 1; c < width - 1; c++) {
                screen.setCell(x + c, y, { char: borderChars.top, fg });
            }
            screen.setCell(x + width - 1, y, { char: borderChars.topRight, fg });

            // Bottom edge
            screen.setCell(x, y + height - 1, { char: borderChars.bottomLeft, fg });
            for (let c = 1; c < width - 1; c++) {
                screen.setCell(x + c, y + height - 1, { char: borderChars.bottom, fg });
            }
            screen.setCell(x + width - 1, y + height - 1, { char: borderChars.bottomRight, fg });

            // Left and right edges
            for (let r = 1; r < height - 1; r++) {
                screen.setCell(x, y + r, { char: borderChars.left, fg });
                screen.setCell(x + width - 1, y + r, { char: borderChars.right, fg });
            }
        }

        // Content area (inside border + padding)
        const padding = normalizeEdges(this._style.padding);
        const borderWidth = borderChars ? 1 : 0;
        const cx = x + borderWidth + padding.left;
        const cy = y + borderWidth + padding.top;
        const contentWidth = Math.max(0, width - borderWidth * 2 - padding.left - padding.right);
        const contentHeight = Math.max(0, height - borderWidth * 2 - padding.top - padding.bottom);

        let row = 0;

        // Title (bold)
        if (this._title && row < contentHeight) {
            screen.writeString(cx, cy + row, this._title.slice(0, contentWidth), {
                ...attrs,
                fg: color,
                bold: true,
            });
            row++;
        }

        // Body text
        if (this._body) {
            const lines = this._body.split('\n');
            for (const line of lines) {
                if (row >= contentHeight) break;
                screen.writeString(cx, cy + row, line.slice(0, contentWidth), {
                    ...attrs,
                    fg: color,
                });
                row++;
            }
        }
    }
}
