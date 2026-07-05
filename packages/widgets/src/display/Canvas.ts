// ─────────────────────────────────────────────────────
// @termuijs/widgets — Canvas widget
// ─────────────────────────────────────────────────────

import type { Screen, Style, Color } from '@termuijs/core';
import { styleToCellAttrs, BRAILLE_OFFSET, BRAILLE_DOTS } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

/**
 * A raw Canvas widget providing a HTML5-like 2D drawing context for custom rendering.
 * Mapped to Braille characters for 2x4 sub-cell pixel resolution.
 */
export class Canvas extends Widget {
    private _pixels: Uint8Array;
    private _canvasWidth: number = 0;
    private _canvasHeight: number = 0;
    private _color: Color | undefined;
    private _commands: Array<() => void> = [];

    constructor(style: Partial<Style> = {}) {
        super(style);
        this._pixels = new Uint8Array(0);
    }

    /**
     * Sets the active drawing color. If not set, the foreground color from style is used.
     */
    public setColor(color: Color): void {
        this._color = color;
    }

    /**
     * Clears the entire canvas.
     */
    public clear(): void {
        if (this._canvasWidth === 0) {
            this._commands = [];
            return;
        }
        if (this._pixels.length > 0) {
            this._pixels.fill(0);
            this.markDirty();
        }
    }

    /**
     * Sets a single sub-cell pixel.
     */
    public setPixel(x: number, y: number, value: boolean = true): void {
        if (this._canvasWidth === 0) {
            this._commands.push(() => this.setPixel(x, y, value));
            return;
        }
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || x >= this._canvasWidth || y < 0 || y >= this._canvasHeight) return;
        
        const idx = y * this._canvasWidth + x;
        const current = this._pixels[idx];
        const next = value ? 1 : 0;
        
        if (current !== next) {
            this._pixels[idx] = next;
            this.markDirty();
        }
    }

    /**
     * Fills a rectangle with the current drawing state.
     */
    public fillRect(x: number, y: number, w: number, h: number): void {
        if (this._canvasWidth === 0) {
            this._commands.push(() => this.fillRect(x, y, w, h));
            return;
        }
        x = Math.floor(x);
        y = Math.floor(y);
        w = Math.floor(w);
        h = Math.floor(h);

        let dirty = false;
        for (let r = Math.max(0, y); r < Math.min(this._canvasHeight, y + h); r++) {
            for (let c = Math.max(0, x); c < Math.min(this._canvasWidth, x + w); c++) {
                const idx = r * this._canvasWidth + c;
                if (this._pixels[idx] !== 1) {
                    this._pixels[idx] = 1;
                    dirty = true;
                }
            }
        }
        if (dirty) {
            this.markDirty();
        }
    }

    /**
     * Draws an unfilled circle.
     */
    public drawCircle(cx: number, cy: number, r: number): void {
        if (this._canvasWidth === 0) {
            this._commands.push(() => this.drawCircle(cx, cy, r));
            return;
        }
        cx = Math.floor(cx);
        cy = Math.floor(cy);
        r = Math.floor(r);

        // Bresenham's circle algorithm
        let x = 0;
        let y = r;
        let d = 3 - 2 * r;
        
        const drawCirclePixels = (xc: number, yc: number, x: number, y: number) => {
            this.setPixel(xc + x, yc + y);
            this.setPixel(xc - x, yc + y);
            this.setPixel(xc + x, yc - y);
            this.setPixel(xc - x, yc - y);
            this.setPixel(xc + y, yc + x);
            this.setPixel(xc - y, yc + x);
            this.setPixel(xc + y, yc - x);
            this.setPixel(xc - y, yc - x);
        };

        drawCirclePixels(cx, cy, x, y);
        while (y >= x) {
            x++;
            if (d > 0) {
                y--;
                d = d + 4 * (x - y) + 10;
            } else {
                d = d + 4 * x + 6;
            }
            drawCirclePixels(cx, cy, x, y);
        }
    }

    /**
     * Draws a line from (x0, y0) to (x1, y1).
     */
    public lineTo(x0: number, y0: number, x1: number, y1: number): void {
        if (this._canvasWidth === 0) {
            this._commands.push(() => this.lineTo(x0, y0, x1, y1));
            return;
        }
        x0 = Math.floor(x0);
        y0 = Math.floor(y0);
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);

        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;

        while (true) {
            this.setPixel(x0, y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            }
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        const border = this._style.border && this._style.border !== 'none' ? 1 : 0;
        
        const innerWidth = width - border * 2;
        const innerHeight = height - border * 2;

        if (innerWidth <= 0 || innerHeight <= 0) {
            return;
        }

        const pxWidth = innerWidth * 2;
        const pxHeight = innerHeight * 4;

        if (this._canvasWidth !== pxWidth || this._canvasHeight !== pxHeight) {
            const isInitialAllocation = this._canvasWidth === 0;
            const newPixels = new Uint8Array(pxWidth * pxHeight);
            
            // Optionally preserve old pixels if resizing
            for (let r = 0; r < Math.min(this._canvasHeight, pxHeight); r++) {
                for (let c = 0; c < Math.min(this._canvasWidth, pxWidth); c++) {
                    newPixels[r * pxWidth + c] = this._pixels[r * this._canvasWidth + c];
                }
            }

            this._pixels = newPixels;
            this._canvasWidth = pxWidth;
            this._canvasHeight = pxHeight;

            if (isInitialAllocation) {
                const commandsToReplay = this._commands;
                this._commands = [];
                for (const cmd of commandsToReplay) {
                    cmd();
                }
            }
        }

        const { bg, fg } = styleToCellAttrs(this._style);
        const finalFg = this._color ? this._color : fg;

        for (let r = 0; r < innerHeight; r++) {
            for (let c = 0; c < innerWidth; c++) {
                let charCode = BRAILLE_OFFSET;
                let hasPixels = false;
                
                for (let br = 0; br < 4; br++) {
                    for (let bc = 0; bc < 2; bc++) {
                        const px = c * 2 + bc;
                        const py = r * 4 + br;
                        if (this._pixels[py * this._canvasWidth + px]) {
                            charCode |= BRAILLE_DOTS[br][bc];
                            hasPixels = true;
                        }
                    }
                }
                
                const char = hasPixels ? String.fromCharCode(charCode) : ' ';
                screen.setCell(x + border + c, y + border + r, { char, bg, fg: finalFg });
            }
        }
    }
}
