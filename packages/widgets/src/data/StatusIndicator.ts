// ─────────────────────────────────────────────────────
// @termuijs/widgets — StatusIndicator widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface StatusIndicatorOptions {
    /** Color when up/active */
    upColor?: Color;
    /** Color when down/inactive */
    downColor?: Color;
}

/**
 * StatusIndicator — simple up/down indicator with label.
 *
 * Example:
 *   ● API Server — Online
 *   ○ Worker — Offline
 */
export class StatusIndicator extends Widget {
    private _label: string;
    private _isUp: boolean;
    private _upColor: Color;
    private _downColor: Color;

    constructor(label: string, isUp: boolean, style: Partial<Style> = {}, opts: StatusIndicatorOptions = {}) {
        super(style);
        this._label = label;
        this._isUp = isUp;
        this._upColor = opts.upColor ?? { type: 'named', name: 'green' };
        this._downColor = opts.downColor ?? { type: 'named', name: 'red' };
    }

    setStatus(isUp: boolean): void {
        this._isUp = isUp;
        this.markDirty();
    }

    getStatus(): boolean {
        return this._isUp;
    }

    setLabel(label: string): void {
        this._label = label;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const dot = this._isUp ? '●' : '○';
        const statusText = this._isUp ? 'Online' : 'Offline';
        const color = this._isUp ? this._upColor : this._downColor;

        screen.setCell(x, y, { char: dot, fg: color });
        screen.writeString(x + 2, y, `${this._label} — ${statusText}`, {
            ...attrs,
            fg: color,
        });
    }
}
