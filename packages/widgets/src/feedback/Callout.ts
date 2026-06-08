import { type Screen, type Style, type Color, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type CalloutVariant = 'info' | 'warn' | 'success' | 'danger';

export interface CalloutOptions {
    variant?: CalloutVariant;
    title?: string;
}

const ICONS_UNICODE: Record<CalloutVariant, string> = {
    info:    'ℹ',
    warn:    '⚠',
    success: '✓',
    danger:  '✗',
};

const ICONS_ASCII: Record<CalloutVariant, string> = {
    info:    'i',
    warn:    '!',
    success: 'v',
    danger:  'x',
};

const COLORS: Record<CalloutVariant, Color> = {
    info:    { type: 'named', name: 'blue' },
    warn:    { type: 'named', name: 'yellow' },
    success: { type: 'named', name: 'green' },
    danger:  { type: 'named', name: 'red' },
};

export class Callout extends Widget {
    private _message: string;
    private _variant: CalloutVariant;
    private _title: string;

    constructor(message: string, style: Partial<Style> = {}, opts: CalloutOptions = {}) {
        super({ height: 1, ...style });
        this._message = message;
        this._variant = opts.variant ?? 'info';
        this._title = opts.title ?? '';
    }

    setMessage(message: string): void {
        if (message === this._message) return;

        this._message = message;
        this.markDirty();
    }

    setVariant(variant: CalloutVariant): void {
        if (variant === this._variant) return;
        
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
        const icon = iconMap[this._variant];

        let cursor = x;

        screen.writeString(cursor, y, icon, { ...attrs, fg: color, bold: true });
        cursor += icon.length;

        if (this._title) {
            const titleStr = ' ' + this._title;
            const avail = width - cursor;
            if (avail > 0) {
                screen.writeString(cursor, y, titleStr.slice(0, avail), { ...attrs, fg: color, bold: true });
                cursor += titleStr.slice(0, avail).length;
            }
        }

        const msgPrefix = this._title || this._message ? ' ' : '';
        const msgStr = msgPrefix + this._message;
        const avail = width - cursor;
        if (avail > 0) {
            screen.writeString(cursor, y, msgStr.slice(0, avail), { ...attrs, fg: color });
        }
    }
}
