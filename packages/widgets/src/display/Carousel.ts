// Carousel — slide navigator with indicator dots and keyboard controls
import { type Screen, type KeyEvent, styleToCellAttrs, caps, mergeStyles, defaultStyle } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CarouselOptions {
    showDots?: boolean;
    onChange?: (index: number) => void;
}

export class Carousel extends Widget {
    private _slides: string[];
    private _activeIndex = 0;
    private _showDots: boolean;
    private _onChange?: (index: number) => void;
    focusable = true;

    constructor(slides: string[], options: CarouselOptions = {}) {
        super(mergeStyles(defaultStyle(), { flexGrow: 1 }));
        this._slides = slides.length > 0 ? [...slides] : [''];
        this._showDots = options.showDots ?? false;
        this._onChange = options.onChange;
    }

    get activeIndex(): number { return this._activeIndex; }
    get currentSlide(): string { return this._slides[this._activeIndex] ?? ''; }
    get slides(): string[] { return [...this._slides]; }
    get showDots(): boolean { return this._showDots; }

    setIndex(index: number): void {
        const normalized = this._normalizeIndex(index);
        if (normalized === this._activeIndex) return;
        this._activeIndex = normalized;
        this._onChange?.(this._activeIndex);
        this.markDirty();
    }

    next(): void {
        if (this._slides.length === 0) return;
        this.setIndex(this._activeIndex + 1);
    }

    prev(): void {
        if (this._slides.length === 0) return;
        this.setIndex(this._activeIndex - 1);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
                this.prev();
                break;
            case 'right':
                this.next();
                break;
            case 'h':
                if (!event.ctrl && !event.alt) this.prev();
                break;
            case 'l':
                if (!event.ctrl && !event.alt) this.next();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        const slideLines = this.currentSlide.split('\n');
        const indicatorHeight = this._showDots ? 1 : 0;
        const contentHeight = Math.max(0, height - indicatorHeight);

        for (let row = 0; row < contentHeight; row++) {
            const line = slideLines[row] ?? '';
            screen.writeString(x, y + row, line.slice(0, width).padEnd(width), attrs);
        }

        if (this._showDots && height > 0) {
            const activeDot = caps.unicode ? '●' : '(*)';
            const inactiveDot = caps.unicode ? '○' : '( )';
            const indicators = this._slides
                .map((_, index) => index === this._activeIndex ? activeDot : inactiveDot)
                .join(' ');
            screen.writeString(x, y + height - 1, indicators.slice(0, width).padEnd(width), attrs);
        }
    }

    private _normalizeIndex(index: number): number {
        const count = Math.max(1, this._slides.length);
        return ((index % count) + count) % count;
    }
}
