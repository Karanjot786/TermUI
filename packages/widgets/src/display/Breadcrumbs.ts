// ─────────────────────────────────────────────────────
// @termuijs/widgets — Breadcrumbs widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, stringWidth, caps, styleToCellAttrs, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface BreadcrumbsOptions {
    /** Separator drawn between segments. Default: caps.unicode ? '❯' : '>' */
    separator?: string;

    /** Color of the active breadcrumb */
    activeColor?: Color;

    /** Called when a breadcrumb is selected */
    onSelect?: (index: number, label: string) => void;
}

/**
 * Breadcrumbs — renders a non-interactive path trail of segments with separators and truncation.
 *
 * Example output:
 *   Home ❯ Docs ❯ API
 */
export class Breadcrumbs extends Widget {
    private _segments: string[];
    private _separator?: string;
    private _activeColor?: Color;
    private _selectedIndex = 0;
    private _onSelect?: (index: number, label: string) => void;

    constructor(segments: string[], style: Partial<Style> = {}, opts: BreadcrumbsOptions = {}) {
        super(style);
        this._segments = segments;
        this._separator = opts.separator;
        this._activeColor = opts.activeColor;
        this._onSelect = opts.onSelect;
        this._selectedIndex = Math.max(0, segments.length - 1);

        this.focusable = true;
        this.events.on('key', (event) => this.handleKey(event));
    }

    /** Update the trail of segments. */
    setSegments(segments: string[]): void {
        if (
            this._segments.length === segments.length &&
            this._segments.every((segment, index) => segment === segments[index])
        ) {
            return;
        }
        this._segments = segments;
        this._selectedIndex = Math.max(0, segments.length - 1);
        this.markDirty();
    }

    getSegments(): string[] {
        return this._segments;
    }

    handleKey(event: { key: string }): void {
    if (event.key === 'left') {
        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        this.markDirty();
    } else if (event.key === 'right') {
        this._selectedIndex = Math.min(
            this._segments.length - 1,
            this._selectedIndex + 1
        );
        this.markDirty();
    } else if (event.key === 'enter') {
        this._onSelect?.(
            this._selectedIndex,
            this._segments[this._selectedIndex]
        );
    }
}

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();
        if (width <= 0 || height <= 0 || this._segments.length === 0) return;

        const attrs = styleToCellAttrs(this._style);
        const activeColor: Color = this._activeColor ?? { type: 'named', name: 'cyan' };
        const separatorChar = this._separator ?? (caps.unicode ? '❯' : '>');
        const ellipsis = caps.unicode ? '…' : '...';
        const sep = ` ${separatorChar} `;

        let visibleSegments = [...this._segments];
        let text = visibleSegments.join(sep);
        let tw = stringWidth(text);

        // Truncate from the left if it exceeds width
        while (tw > width && visibleSegments.length > 1) {
            visibleSegments.shift();
            text = ellipsis + sep + visibleSegments.join(sep);
            tw = stringWidth(text);
        }

        const hasTruncated = visibleSegments.length < this._segments.length;
        let showEllipsis = hasTruncated;
        
        // If width is so narrow that ellipsis + separator consumes all space,
        // hide them so at least part of the final segment stays visible.
        if (showEllipsis && visibleSegments.length === 1) {
            if (stringWidth(ellipsis + sep) >= width) {
                showEllipsis = false;
            }
        }
        
        let currentX = x;
        const renderList: Array<{ type: 'normal' | 'separator' | 'active', text: string }> = [];

        if (showEllipsis) {
            renderList.push({ type: 'normal', text: ellipsis });
        }

        for (let i = 0; i < visibleSegments.length; i++) {
            if (i > 0 || (showEllipsis && hasTruncated)) {
                renderList.push({ type: 'separator', text: sep });
            }
            const originalIndex =
                this._segments.length - visibleSegments.length + i;

            const isLast = originalIndex === this._selectedIndex;
            renderList.push({ 
                type: isLast ? 'active' : 'normal', 
                text: visibleSegments[i] 
            });
        }

        // Render each part
        for (const item of renderList) {
            const itemWidth = stringWidth(item.text);
            if (currentX - x >= width) break;
            
            const remainingWidth = width - (currentX - x);
            const str = item.text;
            
            const itemAttrs = { ...attrs };
            if (item.type === 'active') {
                itemAttrs.fg = activeColor;
            }
            
            screen.writeString(currentX, y, truncate(str, remainingWidth, ''), itemAttrs);
            currentX += stringWidth(truncate(str, remainingWidth, ''));
        }
    }
}
