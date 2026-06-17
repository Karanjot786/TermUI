// -----------------------------------------------------------------------------
// @termuijs/widgets - Watermark widget
// -----------------------------------------------------------------------------

import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface WatermarkOptions {
    /** Color of the repeated text. Default: brightBlack */
    color?: Color;
    /** Diagonal tilt angle in characters. 0 = horizontal rows. Default: 0 */
    angle?: 0 | 45;
}

const segmenter = new Intl.Segmenter();

/**
 * Watermark - fills its area with faint repeating text.
 */
export class Watermark extends Widget {
    private _text: string;
    private _color: Color;
    private _angle: 0 | 45;

    constructor(text: string, style: Partial<Style> = {}, opts: WatermarkOptions = {}) {
        super(style);
        this._text = text;
        this._color = opts.color ?? { type: 'named', name: 'brightBlack' };
        this._angle = opts.angle ?? 0;
    }

    setText(text: string): void {
        if (this._text === text) return;
        this._text = text;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();
        if (width <= 0 || height <= 0 || this._text.length === 0) return;

        const attrs = { ...styleToCellAttrs(this._style), fg: this._color };
        const rowOffsetStep = this._angle === 45 ? 1 : 0;
        
        const segments = Array.from(segmenter.segment(this._text)).map(s => s.segment);
        if (segments.length === 0) return;

        for (let row = 0; row < height; row++) {
            let col = 0;
            // row * rowOffsetStep produces the 45° horizontal offset per row
            // row * width contributes to linearizing row/col into the segments index
            let index = (row * width + row * rowOffsetStep) % segments.length;
            
            while (col < width) {
                const char = segments[index];
                const charWidth = Math.max(1, stringWidth(char));
                
                screen.setCell(x + col, y + row, {
                    char,
                    width: charWidth,
                    ...attrs,
                });
                
                for (let i = 1; i < charWidth; i++) {
                    if (col + i < width) {
                        screen.setCell(x + col + i, y + row, {
                            char: '',
                            width: 0,
                            ...attrs,
                        });
                    }
                }
                col += charWidth;
                index = (index + 1) % segments.length;
            }
        }
    }
}
