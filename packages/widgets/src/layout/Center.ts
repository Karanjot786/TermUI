// ─────────────────────────────────────────────────────
// @termuijs/widgets — Center widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CenterOptions {
    /** Center horizontally (default: true) */
    horizontal?: boolean;
    /** Center vertically (default: true) */
    vertical?: boolean;
}

/**
 * Center — centers a single child widget horizontally and/or vertically.
 *
 * Computes centering offsets at render time from the child's measured size.
 */
export class Center extends Widget {
    private _horizontal: boolean;
    private _vertical: boolean;

    constructor(style: Partial<Style> = {}, opts: CenterOptions = {}) {
        super(style);
        this._horizontal = opts.horizontal ?? true;
        this._vertical = opts.vertical ?? true;
    }

    protected _renderSelf(_screen: Screen): void {
        // Pure layout container — no self-rendering
    }

    override render(screen: Screen): void {
        if (this._style.visible === false) return;

        const shouldClip = this._style.overflow !== 'visible';
        if (shouldClip) screen.pushClip(this._rect);

        this._renderSelf(screen);
        this._renderBorder(screen);

        const content = this._getContentRect();

        for (const child of this._children) {
            const childRect = child.rect;
            const origRect = { ...childRect };

            let offsetX = content.x;
            let offsetY = content.y;

            if (this._horizontal) {
                offsetX = content.x + Math.max(0, Math.floor((content.width - childRect.width) / 2));
            }
            if (this._vertical) {
                offsetY = content.y + Math.max(0, Math.floor((content.height - childRect.height) / 2));
            }

            // Access protected _rect to temporarily modify for centering
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (child as any)._rect = {
                x: offsetX,
                y: offsetY,
                width: childRect.width,
                height: childRect.height,
            };
            child.render(screen);
            // Restore original rect after rendering
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (child as any)._rect = origRect;
        }

        if (shouldClip) screen.popClip();
    }
}
