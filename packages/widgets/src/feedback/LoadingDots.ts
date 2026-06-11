// ─────────────────────────────────────────────────────
// @termuijs/widgets — LoadingDots widget
// ─────────────────────────────────────────────────────

import { type Style, type Color, type Screen, caps, styleToCellAttrs, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface LoadingDotsOptions {
    /** Label shown before the dots. */
    label?: string;
    /** Maximum number of dots in the cycle. Default: 3 */
    maxDots?: number;
    /** Dot color. Default: cyan */
    color?: Color;
}

export class LoadingDots extends Widget {
    private _label: string;
    private _maxDots: number;
    private _color: Color;
    private _dotCount = 0;

    constructor(style: Partial<Style> = {}, opts: LoadingDotsOptions = {}) {
        super({ height: 1, ...style });
        this._label = opts.label ?? '';
        this._maxDots = opts.maxDots ?? 3;
        this._color = opts.color ?? { type: 'named', name: 'cyan' };
    }

    tick(): void {
        this._dotCount = (this._dotCount + 1) % (this._maxDots + 1);
        this.markDirty();
    }

    setLabel(label: string): void {
        if (label === this._label) return;
        
        this._label = label;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        let currentX = x;

        if (this._label) {
            screen.writeString(currentX, y, this._label, attrs);
            currentX += stringWidth(this._label);
        }


        const dotChar = caps.unicode ? '·' : '.';
        const dots = dotChar.repeat(this._dotCount);
        const padding = ' '.repeat(this._maxDots - this._dotCount);

        screen.writeString(currentX, y, dots + padding, { ...attrs, fg: this._color });
    }
}
