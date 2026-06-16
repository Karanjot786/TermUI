import {
    type Screen,
    type Style,
    type KeyEvent,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CarouselOptions {
    loop?: boolean;
    showDots?: boolean;
    showArrows?: boolean;
}

export class Carousel extends Widget {
    private _items: string[];
    private _index = 0;
    private _opts: Required<CarouselOptions>;

    constructor(
        items: string[],
        style: Partial<Style> = {},
        opts: CarouselOptions = {},
    ) {
        super(style);

        this._items = items;
        this._opts = {
            loop: opts.loop ?? false,
            showDots: opts.showDots ?? true,
            showArrows: opts.showArrows ?? true,
        };

        this.focusable = true;
    }

    getIndex(): number {
        return this._index;
    }

    setIndex(index: number): void {
        if (this._items.length === 0) {
            this._index = 0;
        } else {
            this._index = Math.max(
                0,
                Math.min(index, this._items.length - 1),
            );
        }

        this.markDirty();
    }

    next(): void {
        if (this._items.length === 0) return;

        if (this._index >= this._items.length - 1) {
            if (this._opts.loop) {
                this._index = 0;
            }
        } else {
            this._index++;
        }

        this.markDirty();
    }

    prev(): void {
        if (this._items.length === 0) return;

        if (this._index <= 0) {
            if (this._opts.loop) {
                this._index = this._items.length - 1;
            }
        } else {
            this._index--;
        }

        this.markDirty();
    }

    setItems(items: string[]): void {
        this._items = items;

        if (this._index >= items.length) {
            this._index = Math.max(0, items.length - 1);
        }

        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
            case 'h':
                this.prev();
                break;

            case 'right':
            case 'l':
                this.next();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const item = this._items[this._index] ?? '';

        const leftArrow = this._opts.showArrows
            ? caps.unicode
                ? '◄ '
                : '< '
            : '';

        const rightArrow = this._opts.showArrows
            ? caps.unicode
                ? ' ►'
                : ' >'
            : '';

        const header =
            `${leftArrow}Item ${this._index + 1} of ${this._items.length}: ${item}${rightArrow}`;

        screen.writeString(
            x,
            y,
            header.slice(0, width),
            attrs,
        );

        if (height >= 2 && this._opts.showDots) {
            const activeDot = caps.unicode ? '●' : '*';
            const inactiveDot = caps.unicode ? '○' : '.';

            const dots = this._items
                .map((_, i) =>
                    i === this._index ? activeDot : inactiveDot,
                )
                .join(' ');

            screen.writeString(
                x,
                y + 1,
                dots.slice(0, width),
                attrs,
            );
        }
    }
}

