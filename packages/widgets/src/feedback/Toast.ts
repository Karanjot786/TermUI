// ─────────────────────────────────────────────────
// @termuijs/widgets — Toast widget
// ─────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, getBorderChars, caps, stringWidth, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { type StatusVariant } from './StatusMessage.js';

export interface ToastOptions {
    /** Variant determines icon and border color */
    variant?: StatusVariant;
    /** The message to display */
    message: string;
    /** Time in milliseconds before the toast auto-dismisses. Set to 0 to disable auto-dismiss. */
    duration?: number;
    /** Called when the toast is dismissed (either by timeout or manually) */
    onDismiss?: () => void;
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

const DEFAULT_DURATION = 3000;

/**
 * Toast — transient, non-blocking notification box with a colored border and an icon prefix.
 *
 * Renders a compact bordered box containing an icon and a message, colored
 * according to the variant. Auto-dismisses after `duration` milliseconds
 * (default 3000ms) unless `duration` is set to 0. Uses `caps.unicode` to
 * choose between Unicode box-drawing/icons and ASCII fallback.
 */
export class Toast extends Widget {
    private _variant: StatusVariant;
    private _message: string;
    private _duration: number;
    private _onDismiss?: () => void;
    private _visible = true;
    private _timer?: ReturnType<typeof setTimeout>;

    constructor(opts: ToastOptions, style: Partial<Style> = {}) {
        // Do NOT set border in style — we render it manually for color control
        super({
            width: '100%',
            padding: 1,
            ...style,
        });
        this._variant = opts.variant ?? 'info';
        this._message = opts.message ?? '';
        this._duration = opts.duration ?? DEFAULT_DURATION;
        this._onDismiss = opts.onDismiss;

        if (this._duration > 0) {
            this._timer = setTimeout(() => this.dismiss(), this._duration);
        }
    }

    /** Dismiss the toast immediately, cancelling any pending auto-dismiss timer */
    dismiss(): void {
        if (!this._visible) {
            return;
        }
        this._visible = false;
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
        this.markDirty();
        this._onDismiss?.();
    }

    /** Whether the toast is currently visible */
    isVisible(): boolean {
        return this._visible;
    }

    /** Set the toast message */
    setMessage(message: string): void {
        if (message === this._message) {
            return;
        }
        this._message = message;
        this.markDirty();
    }

    /** Get the toast message */
    getMessage(): string {
        return this._message;
    }

    /** Set the toast variant */
    setVariant(variant: StatusVariant): void {
        if (variant === this._variant) {
            return;
        }
        this._variant = variant;
        this.markDirty();
    }

    /** Get the toast variant */
    getVariant(): StatusVariant {
        return this._variant;
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._visible) return;

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

        // Content area (inside border + padding=1)
        const cx = x + 2; // border(1) + padding(1)
        const cy = y + 2;
        const contentWidth = Math.max(0, width - 4);  // left/right border+padding
        const contentHeight = Math.max(0, height - 4); // top/bottom border+padding

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