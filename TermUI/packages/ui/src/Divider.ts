// Divider — horizontal separator line
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs } from '@termuijs/core';

export interface DividerOptions {
    char?: string;
    color?: Style['fg'];
    title?: string;
}

export class Divider extends Widget {
    private _char: string;
    private _color: Style['fg'];
    private _title: string;

    constructor(options: DividerOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: 1 }));
        this._char = options.char ?? '─';
        this._color = options.color;
        this._title = options.title ?? '';
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;
        if (width <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        if (this._color) attrs.fg = this._color;
        attrs.dim = true;
        if (this._title) {
            const titleStr = ` ${this._title} `;
            const padLeft = Math.max(0, Math.floor((width - titleStr.length) / 2));
            const padRight = Math.max(0, width - padLeft - titleStr.length);
            const line = this._char.repeat(padLeft) + titleStr + this._char.repeat(padRight);
            screen.writeString(x, y, line.slice(0, width), attrs);
        } else {
            screen.writeString(x, y, this._char.repeat(width), attrs);
        }
    }
}
