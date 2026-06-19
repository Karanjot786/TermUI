import type { Screen, Style, Color, KeyEvent } from '@termuijs/core';
import { styleToCellAttrs, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface ContextMenuItem {
    label: string;
    action: () => void;
}

export interface ContextMenuOptions {
    x?: number;
    y?: number;
    visible?: boolean;
    style?: Partial<Style>;
    items?: ContextMenuItem[];
}

export class ContextMenu extends Widget {
    private _x: number;
    private _y: number;
    private _visible: boolean;
    private _items: ContextMenuItem[];
    private _selectedIndex: number;

    constructor(options: ContextMenuOptions = {}) {
        const x = options.x ?? 0;
        const y = options.y ?? 0;
        
        super({
            x,
            y,
            zIndex: 9999, // Float above everything
            border: 'single',
            bg: { type: 'named', name: 'brightBlack' } as Color,
            ...options.style
        });

        this._x = x;
        this._y = y;
        this._visible = options.visible ?? false;
        this._items = options.items ?? [];
        this._selectedIndex = 0;
        
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

    get items(): ContextMenuItem[] { return this._items; }
    set items(val: ContextMenuItem[]) {
        this._items = val;
        this._selectedIndex = 0;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (!this._visible || this._items.length === 0) return;

        if (event.key === 'up') {
            this._selectedIndex = (this._selectedIndex - 1 + this._items.length) % this._items.length;
            this.markDirty();
        } else if (event.key === 'down') {
            this._selectedIndex = (this._selectedIndex + 1) % this._items.length;
            this.markDirty();
        } else if (event.key === 'enter' || event.key === 'return') {
            const item = this._items[this._selectedIndex];
            if (item && item.action) {
                item.action();
            }
        }
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._visible) return;

        const { bg, fg } = styleToCellAttrs(this._style);
        if (bg.type === 'none') return;

        const { x, y, width, height } = this._rect;
        const border = this._style.border && this._style.border !== 'none' ? 1 : 0;

        // Fill background
        for (let r = border; r < height - border; r++) {
            for (let c = border; c < width - border; c++) {
                screen.setCell(x + c, y + r, { char: ' ', bg });
            }
        }

        // Render items
        for (let i = 0; i < this._items.length; i++) {
            const itemY = y + border + i;
            if (itemY >= y + height - border) break;

            const item = this._items[i];
            const isSelected = i === this._selectedIndex;
            
            const prefix = isSelected ? '> ' : '  ';
            const labelStr = truncate(prefix + item.label, width - border * 2);

            const itemBg = isSelected ? { type: 'named', name: 'white' } as Color : bg;
            const itemFg = isSelected ? { type: 'named', name: 'black' } as Color : fg;

            for (let c = 0; c < labelStr.length; c++) {
                screen.setCell(x + border + c, itemY, { 
                    char: labelStr[c], 
                    bg: itemBg,
                    fg: itemFg
                });
            }
        }
    }
}
