import { type Screen, type Style, styleToCellAttrs, stringWidth, prefersReducedMotion } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type MarqueeDirection = 'left' | 'right';

export interface MarqueeOptions {
    direction?: MarqueeDirection;
    speed?: number;
    gap?: number;
}

export class Marquee extends Widget {
    private _text: string;
    private _direction: MarqueeDirection;
    private _speed: number;
    private _gap: number;
    private _offset: number = 0;

    constructor(text: string, style: Partial<Style> = {}, opts: MarqueeOptions = {}) {
        super(style);
        this._text = text;
        this._direction = opts.direction ?? 'left';
        this._speed = opts.speed ?? 1;
        this._gap = opts.gap ?? 4;
    }

    tick(): void {
        if (prefersReducedMotion()) return;
        this._offset += this._speed;
        this.markDirty();
    }

    setText(text: string): void {
        if (text === this._text) return;
        this._text = text;
        this._offset = 0;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || !this._text) return;

        const attrs = styleToCellAttrs(this._style);

        const textW = stringWidth(this._text);
        if (textW === 0) return;

        const gapSpaces = ' '.repeat(this._gap);
        const repeatLen = textW + this._gap;

        const totalNeeded = width + repeatLen;
        const repeats = Math.ceil(totalNeeded / repeatLen);
        let full = '';
        for (let i = 0; i < repeats; i++) {
            full += this._text + gapSpaces;
        }

        const effectiveOffset = this._direction === 'left'
            ? (this._offset % repeatLen)
            : (repeatLen - (this._offset % repeatLen));

        const start = effectiveOffset % full.length;
        const visible = full.slice(start, start + width);

        screen.writeString(x, y, visible, attrs);
    }
}
