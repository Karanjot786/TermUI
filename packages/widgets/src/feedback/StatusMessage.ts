// ─────────────────────────────────────────────────────
// @termuijs/widgets — StatusMessage widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type StatusVariant = 'success' | 'error' | 'warning' | 'info';

export interface StatusMessageOptions {
    /** Variant determines icon and color */
    variant?: StatusVariant;
    /** Override the icon character */
    icon?: string;
}

// Icons: unicode and ASCII fallbacks
const ICONS_UNICODE: Record<StatusVariant, string> = {
    success: '✓',
    error:   '✗',
    warning: '⚠',
    info:    'ℹ',
};

const ICONS_ASCII: Record<StatusVariant, string> = {
    success: '+',
    error:   'x',
    warning: '!',
    info:    'i',
};

const COLORS: Record<StatusVariant, Color> = {
    success: { type: 'named', name: 'green' },
    error:   { type: 'named', name: 'red' },
    warning: { type: 'named', name: 'yellow' },
    info:    { type: 'named', name: 'cyan' },
};

/**
 * StatusMessage — a single-line status indicator.
 *
 * Renders an icon (✓/✗/⚠/ℹ) followed by a message, colored by variant.
 */
export class StatusMessage extends Widget {
    private _message: string;
    private _variant: StatusVariant;
    private _icon?: string;

    constructor(message: string, style: Partial<Style> = {}, opts: StatusMessageOptions = {}) {
        super({ height: 1, ...style });
        this._message = message;
        this._variant = opts.variant ?? 'info';
        this._icon = opts.icon;
    }

    setMessage(message: string): void {
        if (this._message === message) return;

        this._message = message;
        this.markDirty();
    }

    setVariant(variant: StatusVariant): void {
        if (this._variant === variant) return;
        
        this._variant = variant;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const color = COLORS[this._variant];
        const iconMap = caps.unicode ? ICONS_UNICODE : ICONS_ASCII;
        const icon = this._icon ?? iconMap[this._variant];

        // Render icon in variant color
        screen.writeString(x, y, icon, { ...attrs, fg: color, bold: true });

        // Space + message
        const msgX = x + icon.length + 1;
        const remaining = width - icon.length - 1;
        if (remaining > 0) {
            screen.writeString(msgX, y, this._message.slice(0, remaining), { ...attrs, fg: color });
        }
    }
}
