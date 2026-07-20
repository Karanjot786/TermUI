// ─────────────────────────────────────────────────────
// @termuijs/widgets — Scrollbar widget
// Proportional scrollbar with 4 orientation modes.
// ─────────────────────────────────────────────────────

import {
    type Screen, type Style, type Color,
    ScrollbarSets,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

// ── Types ────────────────────────────────────────────

export type ScrollbarOrientation =
    | 'verticalRight'
    | 'verticalLeft'
    | 'horizontalBottom'
    | 'horizontalTop';

export interface ScrollbarOptions {
    /** Total number of content items. */
    contentLength: number;
    /** Number of items visible in the viewport. */
    viewportLength: number;
    /** Current scroll position (0-based). */
    position?: number;
    /** Scrollbar orientation. Default: 'verticalRight'. */
    orientation?: ScrollbarOrientation;
    /** Color of the thumb. */
    thumbColor?: Color;
    /** Color of the track. */
    trackColor?: Color;
    /** Show begin/end arrow symbols. Default: true. */
    showArrows?: boolean;
}

// ── Widget ───────────────────────────────────────────

export class Scrollbar extends Widget {
    private _contentLength: number;
    private _viewportLength: number;
    private _position: number;
    private _orientation: ScrollbarOrientation;
    private _thumbColor: Color;
    private _trackColor: Color;
    private _showArrows: boolean;

    constructor(style: Partial<Style> = {}, opts: ScrollbarOptions) {
        super(style);
        this._contentLength = opts.contentLength;
        this._viewportLength = opts.viewportLength;
        this._position = opts.position ?? 0;
        this._orientation = opts.orientation ?? 'verticalRight';
        this._thumbColor = opts.thumbColor ?? { type: 'named', name: 'white' };
        this._trackColor = opts.trackColor ?? { type: 'named', name: 'brightBlack' };
        this._showArrows = opts.showArrows ?? true;
    }

    setPosition(position: number): void {
        this._position = position;
        this.markDirty();
    }

    setContentLength(length: number): void {
        this._contentLength = length;
        this.markDirty();
    }

    setViewportLength(length: number): void {
        this._viewportLength = length;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._contentLength <= 0) return;
        if (this._contentLength <= this._viewportLength) return;

        const vertical = this._orientation === 'verticalRight'
            || this._orientation === 'verticalLeft';

        const symbols = vertical
            ? ScrollbarSets.VERTICAL
            : ScrollbarSets.HORIZONTAL;

        // Determine track position
        const trackX = this._orientation === 'verticalLeft' ? x
            : this._orientation === 'verticalRight' ? x + width - 1
                : x;
        const trackY = this._orientation === 'horizontalTop' ? y
            : this._orientation === 'horizontalBottom' ? y + height - 1
                : y;

        const totalLength = vertical ? height : width;
        if (totalLength <= 0) return;

        let trackStart = 0;
        let trackLength = totalLength;

        // Draw arrow symbols
        if (this._showArrows && totalLength > 2) {
            const beginX = vertical ? trackX : x;
            const beginY = vertical ? y : trackY;
            screen.setCell(beginX, beginY, {
                char: symbols.begin,
                fg: this._trackColor,
            });

            const endX = vertical ? trackX : x + totalLength - 1;
            const endY = vertical ? y + totalLength - 1 : trackY;
            screen.setCell(endX, endY, {
                char: symbols.end,
                fg: this._trackColor,
            });

            trackStart = 1;
            trackLength -= 2;
        }

        if (trackLength <= 0) return;

        // Compute thumb size and position
        const thumbSize = Math.max(1, Math.floor(
            (trackLength * this._viewportLength) / this._contentLength
        ));
        const maxScroll = Math.max(1, this._contentLength - this._viewportLength);
        const thumbOffset = Math.min(
            trackLength - thumbSize,
            Math.floor((this._position * (trackLength - thumbSize)) / maxScroll),
        );

        // Draw track and thumb
        for (let i = 0; i < trackLength; i++) {
            const pos = trackStart + i;
            const cellX = vertical ? trackX : x + pos;
            const cellY = vertical ? y + pos : trackY;

            const isThumb = i >= thumbOffset && i < thumbOffset + thumbSize;

            screen.setCell(cellX, cellY, {
                char: isThumb ? symbols.thumb : symbols.track,
                fg: isThumb ? this._thumbColor : this._trackColor,
            });
        }
    }
}
