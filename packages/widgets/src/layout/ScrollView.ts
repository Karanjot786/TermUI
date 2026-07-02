// ─────────────────────────────────────────────────────
// @termuijs/widgets — ScrollView widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, type KeyEvent, normalizeNavigationKey } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { ScrollAcceleration } from './scroll-acceleration.js';


export interface ScrollViewOptions {
    /** Total height of content in rows */
    contentHeight?: number;
    /** Show scrollbar indicator on right edge */
    showScrollbar?: boolean;
     /** Whether to use scroll acceleration */
    scrollAccel?: boolean;
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
    private _scrollAccel: boolean;
    private _acceleration = new ScrollAcceleration();
    

    constructor(style: Partial<Style> = {}, opts: ScrollViewOptions = {}) {
        super({ overflow: 'hidden', ...style });
        this._contentHeight = opts.contentHeight ?? 0;
        this._showScrollbar = opts.showScrollbar ?? true;
        this._scrollAccel = opts.scrollAccel ??  false;
        this.focusable = true;
    }

    /** Set the total content height (in rows) */
    setContentHeight(h: number): void {
        if (this._contentHeight === h) return;

        this._contentHeight = h;
        this._clampOffset();
        this.markDirty();
    }

    /** Get current scroll offset */
    get scrollOffset(): number { return this._scrollOffset; }

    /** Scroll by delta rows */
    scrollBy(delta: number): void {
        this._scrollOffset = Math.round(this._scrollOffset + delta);
        this._clampOffset();
        this.markDirty();
    }

    /** Scroll to absolute offset */
    scrollTo(offset: number): void {
        const previousOffset = this._scrollOffset;
    
        this._scrollOffset = Math.round(offset);
        this._clampOffset();
    
        if (previousOffset !== this._scrollOffset) {
            this.markDirty();
        }
    }

    private _clampOffset(): void {
        const viewHeight = this._rect.height;
        const maxOffset = Math.max(0, this._contentHeight - viewHeight);
        this._scrollOffset = Math.max(0, Math.min(this._scrollOffset, maxOffset));
    }
    
    private getScrollDelta(baseDelta: number): number {
    if (!this._scrollAccel) {
        return baseDelta;
    }

    const multiplier =
        this._acceleration.getMultiplier(
            Date.now()
        );

    return baseDelta * multiplier; 
}
    /** Handle keyboard navigation */
    handleKey(event: KeyEvent): void {
        const token = `${event.ctrl ? 'ctrl+' : ''}${event.alt ? 'alt+' : ''}${event.shift ? 'shift+' : ''}${String(event.key).toLowerCase()}`;
        switch (normalizeNavigationKey(token)) {
            case 'up':       this.scrollBy(-this.getScrollDelta(1)); break;
            case 'down':     this.scrollBy(this.getScrollDelta(1)); break;
            case 'pageup':   this.scrollBy(-this.getScrollDelta(Math.max(1, this._rect.height - 1))); break;
            case 'pagedown': this.scrollBy(this.getScrollDelta(Math.max(1, this._rect.height - 1))); break;
        }
    }

    override render(screen: Screen): void {
        if (this._style.visible === false) return;

        const shouldClip = true;
        if (shouldClip) screen.pushClip(this._rect);

        this._renderSelf(screen);
        this._renderBorder(screen);

        // Render children with a Y offset for scrolling
        const rect = this._getContentRect();
        screen.pushTranslateY(-this._scrollOffset);
        for (const child of this._children) {
            child.render(screen);
        }
        screen.popTranslateY();

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
