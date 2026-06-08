import { type Screen, type Style, type Color, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface BrailleCanvasOptions {
    width: number;
    height: number;
    color?: Color;
}

const BRAILLE_BITS = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80],
] as const;

export class BrailleCanvas extends Widget {
    private _canvasWidth: number;
    private _canvasHeight: number;
    private _pixels: boolean[][];
    private _color?: Color;

    constructor(
        opts: BrailleCanvasOptions,
        style: Partial<Style> = {},
    ) {
        super(style);

        this._canvasWidth = opts.width;
        this._canvasHeight = opts.height;
        this._color = opts.color;

        this._pixels = Array.from(
            { length: this._canvasHeight },
            () => Array(this._canvasWidth).fill(false),
        );
    }

    drawPixel(x: number, y: number): void {
        if (
            x < 0 ||
            y < 0 ||
            x >= this._canvasWidth ||
            y >= this._canvasHeight
        ) {
            return;
        }

        this._pixels[y]![x] = true;
        this.markDirty();
    }

    drawLine(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
    ): void {
       
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);

    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;

    let err = dx - dy;

    while (true) {
        this.drawPixel(x0, y0);

        if (x0 === x1 && y0 === y1) {
            break;
        }

        const e2 = err * 2;

        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }

        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    
    }
    this.markDirty();
}
    

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();

        if (rect.width <= 0 || rect.height <= 0) {
            return;
        }

        const { x, y } = rect;

        const cellWidth = Math.ceil(this._canvasWidth / 2);
        const cellHeight = Math.ceil(this._canvasHeight / 4);

        for (let cy = 0; cy < cellHeight; cy++) {
            for (let cx = 0; cx < cellWidth; cx++) {
                let pattern = 0;

                for (let py = 0; py < 4; py++) {
                    for (let px = 0; px < 2; px++) {
                        const pixelX = cx * 2 + px;
                        const pixelY = cy * 4 + py;

                        if (
                            pixelY < this._canvasHeight &&
                            pixelX < this._canvasWidth &&
                            this._pixels[pixelY]?.[pixelX]
                        ) {
                            pattern |= BRAILLE_BITS[py]![px]!;
                        }
                    }
                }

                 const char = caps.unicode
                   ? String.fromCharCode(0x2800 + pattern)
                   : pattern === 0
                  ? ' '
                  : '#';

                screen.setCell(
                    x + cx,
                    y + cy,
                    {
                        char,
                        fg: this._color,
                    },
                );
            }
        }
    }
}