// Modal — overlay dialog with backdrop
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, getBorderChars, caps } from '@termuijs/core';

export interface ModalOptions {
    title?: string;
    width?: number;
    height?: number;
    borderColor?: Style['fg'];
    backdropChar?: string;
}

export class Modal extends Widget {
    private _title: string;
    private _modalWidth: number;
    private _modalHeight: number;
    private _borderColor: Style['fg'];
    private _backdropChar: string;
    private _visible = false;
    private _content: Widget | null = null;

    constructor(options: ModalOptions = {}, style?: Partial<Style>) {
        super(mergeStyles(defaultStyle(), style ?? {}));
        this._title = options.title ?? '';
        this._modalWidth = options.width ?? 50;
        this._modalHeight = options.height ?? 15;
        this._borderColor = options.borderColor ?? { type: 'named', name: 'cyan' };
        this._backdropChar = options.backdropChar ?? (caps.unicode ? '░' : ' ');
    }

    get visible(): boolean { return this._visible; }
    show(): void { this._visible = true; this.markDirty(); }
    hide(): void { this._visible = false; this.markDirty(); }
    toggle(): void { this._visible = !this._visible; this.markDirty(); }
    setContent(content: Widget): void { this._content = content; this.markDirty(); }

    protected _renderSelf(screen: Screen): void {
        if (!this._visible) return;
        const { x, y, width, height } = this._rect;
        const attrs = styleToCellAttrs(this.style);
        // Backdrop
        for (let r = 0; r < height; r++) {
            screen.writeString(x, y + r, this._backdropChar.repeat(width), { ...attrs, dim: true });
        }
        // Centered modal
        const mw = Math.min(this._modalWidth, width - 4);
        const mh = Math.min(this._modalHeight, height - 2);
        const mx = x + Math.floor((width - mw) / 2);
        const my = y + Math.floor((height - mh) / 2);
        const border = getBorderChars('single');
        if (!border) return;
        const bAttrs = { ...attrs, fg: this._borderColor };
        // Title bar
        const titleStr = this._title ? ` ${this._title} ` : '';
        const topFill = mw - 2 - titleStr.length;
        const tl = Math.floor(topFill / 2);
        const tr = topFill - tl;
        screen.writeString(mx, my, border.topLeft + border.top.repeat(tl) + titleStr + border.top.repeat(Math.max(0, tr)) + border.topRight, bAttrs);
        // Sides
        const clr = styleToCellAttrs(this.style);
        for (let r = 1; r < mh - 1; r++) {
            screen.writeString(mx, my + r, border.left, bAttrs);
            screen.writeString(mx + 1, my + r, ' '.repeat(mw - 2), clr);
            screen.writeString(mx + mw - 1, my + r, border.right, bAttrs);
        }
        // Bottom
        screen.writeString(mx, my + mh - 1, border.bottomLeft + border.bottom.repeat(mw - 2) + border.bottomRight, bAttrs);
        // Content
        if (this._content) {
            const cr = { x: mx + 2, y: my + 1, width: mw - 4, height: mh - 2 };
            this._content.updateRect(cr);
            this._content.render(screen);
        }
        screen.applyBackdropFilter({ x: mx, y: my, width: mw, height: mh });
    }
}
