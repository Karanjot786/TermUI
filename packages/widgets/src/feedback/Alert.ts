// ─────────────────────────────────────────────────────
// @termuijs/widgets — Alert widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, getBorderChars, caps, stringWidth, truncate, normalizeEdges } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { type StatusVariant } from './StatusMessage.js';

export interface AlertOptions {
    /** Variant determines icon and border color */
    variant?: StatusVariant;
    /** The message to display */
    message: string;
}

const VARIANT_COLORS: Record<StatusVariant, Color> = {
    success: { type: 'named', name: 'green' },
    error:   { type: 'named', name: 'red' },
    warning: { type: 'named', name: 'yellow' },
    info:    { type: 'named', name: 'cyan' },
};

const ICONS_UNICODE: Record<StatusVariant, string> = {
    info: '●',
    success: '✓',
    warning: '!',
    error: '✗',
};

const ICONS_ASCII: Record<StatusVariant, string> = {
    info: 'i',
    success: '[OK]',
    warning: '[!]',
    error: '[x]',
};

/**
 * Alert — full-width status message box with a colored border and an icon prefix.
 *
 * Renders a bordered box containing an icon and a message on a single line,
 * colored according to the variant. Uses `caps.unicode` to choose between
 * Unicode box-drawing/icons and ASCII fallback borders/icons.
 */
export class Alert extends Widget {
    private _variant: StatusVariant;
    private _message: string;

    constructor(opts: AlertOptions, style: Partial<Style> = {}) {
        // Do NOT set border in style — we render it manually for color control
        super({
            width: '100%',
            padding: 1,
            ...style,
        });
        this._variant = opts.variant ?? 'info';
        this._message = opts.message ?? '';
    }

    /** Set the alert message */
    setMessage(message: string): void {
        if (message === this._message) {
            return;
        }
        this._message = message;
        this.markDirty();
    }

    /** Get the alert message */
    getMessage(): string {
        return this._message;
    }

    /** Set the alert variant */
    setVariant(variant: StatusVariant): void {
        if (variant === this._variant) {
            return;
        }
        this._variant = variant;
        this.markDirty();
    }

    /** Get the alert variant */
    getVariant(): StatusVariant {
        return this._variant;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width < 2 || height < 2) return;

        const attrs = styleToCellAttrs(this._style);
        const color = VARIANT_COLORS[this._variant];
        const fg = color;

        // Draw border manually in variant color, respecting caps.unicode
        const borderChars = caps.unicode
            ? getBorderChars('single')
            : {
                topLeft: '+',
                top: '-',
                topRight: '+',
                right: '|',
                bottomRight: '+',
                bottom: '-',
                bottomLeft: '+',
                left: '|',
            };

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
        const cx = x + 1 + padding.left; // border(1) + padding.left
        const cy = y + 1 + padding.top;
        const contentWidth = Math.max(0, width - 2 - padding.left - padding.right);
        const contentHeight = Math.max(0, height - 2 - padding.top - padding.bottom);

        if (contentHeight <= 0 || contentWidth <= 0) return;

        const iconMap = caps.unicode ? ICONS_UNICODE : ICONS_ASCII;
        const icon = iconMap[this._variant];

        // Render icon in variant color, bold
        const iconLen = stringWidth(icon);
        screen.writeString(cx, cy, truncate(icon, contentWidth, ''), {
            ...attrs,
            fg: color,
            bold: true,
        });

        // Space + message
        const msgX = cx + iconLen + 1;
        const remaining = contentWidth - iconLen - 1;
        if (remaining > 0) {
            screen.writeString(msgX, cy, truncate(this._message, remaining, ''), {
                ...attrs,
                fg: color,
            });
        }
    }
}
