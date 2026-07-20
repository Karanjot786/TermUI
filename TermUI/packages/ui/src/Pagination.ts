// Pagination — simple page navigator
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs } from '@termuijs/core';

export interface PaginationOptions {
    onChange?: (page: number) => void;
}

export class Pagination extends Widget {
    private _page: number;
    private _totalPages: number;
    private _onChange?: (page: number) => void;
    focusable = true;

    constructor(page: number, totalPages: number, options: PaginationOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: 1 }));
        this._totalPages = Math.max(1, Math.floor(totalPages));
        this._page = this._clamp(Math.floor(page));
        this._onChange = options.onChange;
    }

    get page(): number { return this._page; }
    get totalPages(): number { return this._totalPages; }

    private _clamp(n: number): number {
        if (isNaN(n) || !isFinite(n)) return 1;
        return Math.min(this._totalPages, Math.max(1, n));
    }

    setPage(n: number): void {
        const next = this._clamp(Math.floor(n));
        if (next === this._page) return;
        this._page = next;
        this._onChange?.(this._page);
        this.markDirty();
    }

    next(): void {
        this.setPage(this._page + 1);
    }

    prev(): void {
        this.setPage(this._page - 1);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left': this.prev(); break;
            case 'h': if (!event.ctrl && !event.alt) this.prev(); break;
            case 'right': this.next(); break;
            case 'l': if (!event.ctrl && !event.alt) this.next(); break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;
        if (width <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        const text = `< ${this._page} / ${this._totalPages} >`;
        screen.writeString(x, y, text.slice(0, width), attrs);
    }
}
