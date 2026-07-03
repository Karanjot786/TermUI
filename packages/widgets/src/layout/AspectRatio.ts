import { type Screen, type Style } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface AspectRatioOptions {
    /** Width:height ratio */
    ratio?: number;

    /** contain = fit inside, cover = fill */
    fit?: 'contain' | 'cover';
}

export class AspectRatio extends Widget {
    private _ratio: number;
    private _fit: 'contain' | 'cover';

    constructor(
        child: Widget,
        style: Partial<Style> = {},
        opts: AspectRatioOptions = {},
    ) {
        super(style);

        this._ratio = opts.ratio ?? 2;
        this._fit = opts.fit ?? 'contain';

        this.addChild(child);
    }

    setChild(child: Widget): void {
        this.clearChildren();
        this.addChild(child);
        this.markDirty();
    }

    protected _renderSelf(_screen: Screen): void {
        // Pure layout widget
    }

    override render(screen: Screen): void {
        if (this._style.visible === false) return;

        const shouldClip = this._style.overflow !== 'visible';

        if (shouldClip) {
            screen.pushClip(this._rect);
        }

        this._renderSelf(screen);
        this._renderBorder(screen);

        const content = this._getContentRect();

        for (const child of this._children) {
            const originalRect = { ...child.rect };

            const targetHeight = Math.round(
                content.width / this._ratio,
            );

            const childHeight =
                this._fit === 'contain'
                    ? Math.min(content.height, targetHeight)
                    : content.height;

            const childY =
                content.y +
                Math.floor(
                    (content.height - childHeight) / 2,
                );

            (child as any)._rect = { // as any: _rect is protected; no public API for temporary rect override during measurement
                x: content.x,
                y: childY,
                width: content.width,
                height: childHeight,
            };

            child.render(screen);

            (child as any)._rect = originalRect; // as any: _rect is protected; no public API for temporary rect override during measurement
        }

        if (shouldClip) {
            screen.popClip();
        }
    }
}