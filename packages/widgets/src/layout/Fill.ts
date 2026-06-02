import { type Screen, type Style, type Color } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface FillOptions {
    char?: string;
    color?: Color;
}

export class Fill extends Widget {
    private _char: string;
    private _color?: Color;

    constructor(style: Partial<Style> = {}, opts: FillOptions = {}) {
        super(style);
        this._char = opts.char ?? ' ';
        this._color = opts.color;
    }

    setChar(char: string): void {
        this._char = char;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) return;

        for (let row = y; row < y + height; row++) {
            for (let col = x; col < x + width; col++) {
                screen.setCell(col, row, {
                    char: this._char,
                    fg: this._color,
                });
            }
        }
    }
}