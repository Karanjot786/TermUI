// ─────────────────────────────────────────────────────
// @termuijs/widgets — ProgressCircle
// Arc/circle progress indicator
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type Color,
    styleToCellAttrs,
    caps,
    stringWidth,
    mergeStyles,
    defaultStyle,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type ProgressCircleSize = 'sm' | 'md';

export interface ProgressCircleOptions {
    value?: number;
    size?: ProgressCircleSize;
    color?: Color;
    label?: string;
    showPercent?: boolean;
}

// Unicode arc chars mapped to 5 levels: 0% 25% 50% 75% 100%
const ARC_CHARS = ['○', '◔', '◑', '◕', '●'];
const ARC_ASCII = ['0', '1', '2', '3', '4'];

export class ProgressCircle extends Widget {
    private _value: number;
    private _size: ProgressCircleSize;
    private _color: Color;
    private _label: string;
    private _showPercent: boolean;

    constructor(style: Partial<Style> = {}, options: ProgressCircleOptions = {}) {
        const size = options.size ?? 'md';
        super(mergeStyles(defaultStyle(), { height: 1, ...style }));
        this._value = Math.max(0, Math.min(100, options.value ?? 0));
        this._size = size;
        this._color = options.color ?? { type: 'named', name: 'cyan' };
        this._label = options.label ?? '';
        this._showPercent = options.showPercent ?? true;
    }

    get value(): number { return this._value; }

    setValue(v: number): void {
        const clamped = Math.max(0, Math.min(100, v));
        if (clamped === this._value) return;
        this._value = clamped;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        switch (this._size) {
            case 'sm': this._renderSm(screen, x, y, attrs); break;
            case 'md': this._renderMd(screen, x, y, width, attrs); break;
        }
    }

    private _renderSm(screen: Screen, x: number, y: number, attrs: ReturnType<typeof styleToCellAttrs>): void {
        const level = Math.round(this._value / 25); // 0-4
        const chars = caps.unicode ? ARC_CHARS : ARC_ASCII;
        const arc = chars[Math.min(level, 4)]!;

        screen.writeString(x, y, arc, { ...attrs, fg: this._color });

        let cx = x + stringWidth(arc) + 1;
        if (this._showPercent) {
            const pct = `${Math.round(this._value)}%`;
            screen.writeString(cx, y, pct, attrs);
            cx += pct.length + 1;
        }
        if (this._label) {
            screen.writeString(cx, y, this._label, { ...attrs, dim: true });
        }
    }

    private _renderMd(screen: Screen, x: number, y: number, width: number, attrs: ReturnType<typeof styleToCellAttrs>): void {
        // Format: [████░░░░] 50%
        const suffix = this._showPercent ? ` ${Math.round(this._value)}%` : '';
        const bracketWidth = Math.max(2, Math.min(width - suffix.length - 2, 10));
        const filled = Math.round((this._value / 100) * bracketWidth);
        const empty = bracketWidth - filled;

        const fillChar = caps.unicode ? '█' : '#';
        const emptyChar = caps.unicode ? '░' : '-';

        screen.writeString(x, y, '[', attrs);
        for (let i = 0; i < filled; i++) {
            screen.setCell(x + 1 + i, y, { char: fillChar, ...attrs, fg: this._color });
        }
        for (let i = 0; i < empty; i++) {
            screen.setCell(x + 1 + filled + i, y, { char: emptyChar, ...attrs, dim: true });
        }
        screen.writeString(x + 1 + bracketWidth, y, ']', attrs);

        if (suffix) {
            screen.writeString(x + 2 + bracketWidth, y, suffix, { ...attrs, bold: true });
        }
        if (this._label) {
            const labelX = x + 3 + bracketWidth + suffix.length;
            screen.writeString(labelX, y, this._label, { ...attrs, dim: true });
        }
    }

}
