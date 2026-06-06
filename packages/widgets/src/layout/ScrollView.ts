// ─────────────────────────────────────────────────────
// @termuijs/widgets — ScrollView widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, type KeyEvent } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface ScrollViewOptions {
    /** Total height of content in rows */
    contentHeight?: number;
    /** Show scrollbar indicator on right edge */
    showScrollbar?: boolean;
}

/**
 * ScrollView — a height-bounded scrollable container.
 *
 * Children are rendered with a vertical offset applied (scrolling).
 * Responds to up/down arrow keys and Page Up/Page Down.
 */
export class ScrollView extends Widget {
    private _scrollOffset: number = 0;
    private _contentHeight: number;
    private _showScrollbar: boolean;

    constructor(style: Partial<Style> = {}, opts: ScrollViewOptions = {}) {
        super({ overflow: 'hidden', ...style });
        this._contentHeight = opts.contentHeight ?? 0;
        this._showScrollbar = opts.showScrollbar ?? true;
        this.focusable = true;
    }

    /** Set the total content height (in rows) */
    setContentHeight(h: number): void {
        this._contentHeight = h;
        this._clampOffset();
        this.markDirty();
    }

    /** Get current scroll offset */
    get scrollOffset(): number { return this._scrollOffset; }

    /** Scroll by delta rows */
    scrollBy(delta: number): void {
        this._scrollOffset += delta;
        this._clampOffset();
        this.markDirty();
    }

    /** Scroll to absolute offset */
    scrollTo(offset: number): void {
        this._scrollOffset = offset;
        this._clampOffset();
        this.markDirty();
    }

    private _clampOffset(): void {
        const viewHeight = this._rect.height;
        const maxOffset = Math.max(0, this._contentHeight - viewHeight);
        this._scrollOffset = Math.max(0, Math.min(this._scrollOffset, maxOffset));
    }

    /** Handle keyboard navigation */
    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':       this.scrollBy(-1); break;
            case 'down':     this.scrollBy(1); break;
            case 'pageup':   this.scrollBy(-Math.max(1, this._rect.height - 1)); break;
            case 'pagedown': this.scrollBy(Math.max(1, this._rect.height - 1)); break;
        }
    }

    override render(screen: Screen): void {
        if (this._style.visible === false) return;

        const shouldClip = true;
        if (shouldClip) screen.pushClip(this._rect);

        this._renderSelf(screen);
        this._renderBorder(screen);

        // Temporarily shift children's rects upward by scrollOffset
        const rect = this._getContentRect();
        for (const child of this._children) {
            const origRect = { ...child.rect };
            (child as any)._rect = {
                x: origRect.x,
                y: origRect.y - this._scrollOffset,
                width: origRect.width,
                height: origRect.height,
            };
            try {
                child.render(screen);
            } finally {
                (child as any)._rect = origRect;
            }
        }

        if (shouldClip) screen.popClip();

        // Draw scrollbar on top (outside clip)
        if (this._showScrollbar && this._contentHeight > this._rect.height) {
            this._renderScrollbar(screen, rect);
        }
    }

    private _renderScrollbar(screen: Screen, contentRect: { x: number; y: number; width: number; height: number }): void {
        const { y, width, height } = contentRect;
        const scrollX = contentRect.x + width; // right edge of content
        if (scrollX >= this._rect.x + this._rect.width) return;

        const trackHeight = height;
        const thumbSize = Math.max(1, Math.round((height / this._contentHeight) * trackHeight));
        const maxOffset = Math.max(1, this._contentHeight - height);
        const thumbPos = Math.round((this._scrollOffset / maxOffset) * (trackHeight - thumbSize));

        const attrs = styleToCellAttrs(this._style);
        const thumbChar = '█';
        const trackChar = '░';

        for (let i = 0; i < trackHeight; i++) {
            const isThumb = i >= thumbPos && i < thumbPos + thumbSize;
            screen.setCell(scrollX, y + i, {
                char: isThumb ? thumbChar : trackChar,
                ...attrs,
                dim: !isThumb,
            });
        }
    }

    protected _renderSelf(_screen: Screen): void {
        // Container only
    }
}
