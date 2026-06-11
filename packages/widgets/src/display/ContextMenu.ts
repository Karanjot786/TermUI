import type { Screen, Style } from '@termuijs/core';
import { styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface ContextMenuOptions {
    x?: number;
    y?: number;
    visible?: boolean;
    style?: Partial<Style>;
}

export class ContextMenu extends Widget {
    private _x: number;
    private _y: number;
    private _visible: boolean;

    constructor(options: ContextMenuOptions = {}) {
        const x = options.x ?? 0;
        const y = options.y ?? 0;
        
        super({
            x,
            y,
            zIndex: 9999, // Float above everything
            border: 'single',
            bg: 'gray',
            ...options.style
        });

        this._x = x;
        this._y = y;
        this._visible = options.visible ?? false;
        
        if (!this._visible) {
            this.setStyle({ visible: false });
        }
    }

    get x(): number { return this._x; }
    set x(val: number) {
        if (this._x !== val) {
            this._x = val;
            this.setStyle({ x: val });
            this.markDirty();
        }
    }

    get y(): number { return this._y; }
    set y(val: number) {
        if (this._y !== val) {
            this._y = val;
            this.setStyle({ y: val });
            this.markDirty();
        }
    }

    get visible(): boolean { return this._visible; }
    set visible(val: boolean) {
        if (this._visible !== val) {
            this._visible = val;
            this.setStyle({ visible: val });
            this.markDirty();
        }
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._visible) return;

        const { bg } = styleToCellAttrs(this._style);
        if (bg.type === 'none') return;

        const { x, y, width, height } = this._rect;
        const border = this._style.border && this._style.border !== 'none' ? 1 : 0;

        // Fill background
        for (let r = border; r < height - border; r++) {
            for (let c = border; c < width - border; c++) {
                screen.setCell(x + c, y + r, { char: ' ', bg });
            }
        }
    }
}
