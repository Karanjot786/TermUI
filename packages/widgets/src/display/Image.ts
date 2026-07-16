// ─────────────────────────────────────────────────────
// @termuijs/widgets — Image widget (terminal pixel rendering)
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, caps, ColorDepth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface ImageOptions {
    /** Raw RGBA pixel data (4 bytes per pixel: R, G, B, A) */
    data: Uint8Array | Uint8ClampedArray;
    /** Width of the source image in pixels */
    imageWidth: number;
    /** Height of the source image in pixels */
    imageHeight: number;
    /** Preserve aspect ratio when scaling to fit the widget rect (default: true) */
    preserveAspectRatio?: boolean;
    /**
     * Rendering mode override.
     * - 'truecolor': Full RGB via half-block characters (▀) with fg/bg colors
     * - 'ansi256': Downgraded to nearest 256-color palette
     * - 'ascii': Luminance-based ASCII density map (no Unicode required)
     *
     * Auto-detected from terminal capabilities if omitted.
     */
    fallback?: 'truecolor' | 'ansi256' | 'ascii';
}

/**
 * ASCII density ramp from darkest to lightest.
 * Used when the terminal lacks Unicode or color support.
 */
const ASCII_DENSITY = ' .:-=+*#%@';

/**
 * Image — renders raw RGBA pixel data in the terminal.
 *
 * Uses Unicode upper half-block (▀) with foreground color for the top pixel
 * and background color for the bottom pixel, packing 2 vertical pixels per
 * terminal cell. Falls back to ASCII density characters on terminals without
 * Unicode or TrueColor support.
 *
 * Example:
 *   const img = new Image({}, {
 *       data: rgbaBuffer,
 *       imageWidth: 100,
 *       imageHeight: 50,
 *   });
 */
export class Image extends Widget {
    private _data: Uint8Array | Uint8ClampedArray;
    private _imageWidth: number;
    private _imageHeight: number;
    private _preserveAspectRatio: boolean;
    private _fallback: 'truecolor' | 'ansi256' | 'ascii' | undefined;

    constructor(style: Partial<Style> = {}, opts?: ImageOptions) {
        super(style);
        this._data = opts?.data ?? new Uint8Array(0);
        this._imageWidth = opts?.imageWidth ?? 0;
        this._imageHeight = opts?.imageHeight ?? 0;
        this._preserveAspectRatio = opts?.preserveAspectRatio ?? true;
        this._fallback = opts?.fallback;
    }

    /**
     * Update the pixel data buffer.
     * Data must be RGBA format: 4 bytes per pixel (R, G, B, A).
     */
    setData(data: Uint8Array | Uint8ClampedArray, imageWidth: number, imageHeight: number): void {
        this._data = data;
        this._imageWidth = imageWidth;
        this._imageHeight = imageHeight;
        this.markDirty();
    }

    /** Get the current source image width in pixels. */
    getImageWidth(): number {
        return this._imageWidth;
    }

    /** Get the current source image height in pixels. */
    getImageHeight(): number {
        return this._imageHeight;
    }

    /** Set whether to preserve aspect ratio when scaling. */
    setPreserveAspectRatio(value: boolean): void {
        this._preserveAspectRatio = value;
        this.markDirty();
    }

    /** Get whether aspect ratio preservation is enabled. */
    getPreserveAspectRatio(): boolean {
        return this._preserveAspectRatio;
    }

    /** Set the rendering fallback mode ('truecolor', 'ansi256', 'ascii', or undefined for auto). */
    setFallback(mode: 'truecolor' | 'ansi256' | 'ascii' | undefined): void {
        this._fallback = mode;
        this.markDirty();
    }

    /**
     * Determine the effective rendering mode from the fallback option
     * and terminal capabilities.
     */
    private _getMode(): 'truecolor' | 'ansi256' | 'ascii' {
        if (this._fallback) return this._fallback;

        if (!caps.unicode) return 'ascii';

        const depth = caps.colorDepth;
        if (depth === ColorDepth.TrueColor) return 'truecolor';
        if (depth === ColorDepth.Ansi256) return 'ansi256';
        return 'ascii';
    }

    /**
     * Sample a pixel from the source image at (sx, sy) using nearest-neighbor.
     * Returns [r, g, b, a].
     */
    private _samplePixel(sx: number, sy: number): [number, number, number, number] {
        const x = Math.min(Math.floor(sx), this._imageWidth - 1);
        const y = Math.min(Math.floor(sy), this._imageHeight - 1);
        const idx = (y * this._imageWidth + x) * 4;
        return [
            this._data[idx] ?? 0,
            this._data[idx + 1] ?? 0,
            this._data[idx + 2] ?? 0,
            this._data[idx + 3] ?? 255,
        ];
    }

    /**
     * Compute luminance from RGB using standard perceptual weights.
     * Returns a value in [0, 1].
     */
    private _luminance(r: number, g: number, b: number): number {
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    /**
     * Convert RGB values to a Color object based on the rendering mode.
     */
    private _rgbToColor(r: number, g: number, b: number, _mode: 'truecolor' | 'ansi256'): Color {
        // Both modes use the rgb Color type; the renderer in core
        // handles the downgrade to ansi256 codes automatically.
        return { type: 'rgb', r, g, b };
    }

    /**
     * Calculate the scaled output dimensions, accounting for aspect ratio
     * and the half-block technique (2 vertical pixels per cell row).
     */
    private _scaledDimensions(
        availWidth: number,
        availHeight: number,
    ): { renderWidth: number; renderHeight: number } {
        if (this._imageWidth <= 0 || this._imageHeight <= 0) {
            return { renderWidth: 0, renderHeight: 0 };
        }

        // Each cell row holds 2 vertical pixels
        const availPixelHeight = availHeight * 2;

        if (!this._preserveAspectRatio) {
            return {
                renderWidth: availWidth,
                renderHeight: availHeight,
            };
        }

        // Scale to fit while preserving aspect ratio.
        // Terminal cells are roughly 1:2 (width:height), but the half-block
        // technique already halves the vertical dimension, so the effective
        // pixel aspect ratio is approximately 1:1.
        const scaleX = availWidth / this._imageWidth;
        const scaleY = availPixelHeight / this._imageHeight;
        const scale = Math.min(scaleX, scaleY);

        const renderPixelWidth = Math.max(1, Math.floor(this._imageWidth * scale));
        const renderPixelHeight = Math.max(1, Math.floor(this._imageHeight * scale));

        return {
            renderWidth: Math.min(renderPixelWidth, availWidth),
            // Convert pixel height back to cell rows (ceiling to avoid clipping)
            renderHeight: Math.min(Math.ceil(renderPixelHeight / 2), availHeight),
        };
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;
        if (this._data.length === 0 || this._imageWidth <= 0 || this._imageHeight <= 0) return;

        const mode = this._getMode();
        const { renderWidth, renderHeight } = this._scaledDimensions(width, height);

        if (renderWidth <= 0 || renderHeight <= 0) return;

        // Total pixel rows we're mapping to
        const totalPixelRows = renderHeight * 2;

        for (let cellRow = 0; cellRow < renderHeight; cellRow++) {
            for (let cellCol = 0; cellCol < renderWidth; cellCol++) {
                // Source coordinates for top and bottom pixels
                const srcX = (cellCol / renderWidth) * this._imageWidth;
                const topSrcY = ((cellRow * 2) / totalPixelRows) * this._imageHeight;
                const botSrcY = ((cellRow * 2 + 1) / totalPixelRows) * this._imageHeight;

                const [tr, tg, tb, ta] = this._samplePixel(srcX, topSrcY);
                const [br, bg, bb, ba] = this._samplePixel(srcX, botSrcY);

                if (mode === 'ascii') {
                    // Average top and bottom pixels for a single ASCII char
                    const avgR = (tr * ta + br * ba) / (2 * 255);
                    const avgG = (tg * ta + bg * ba) / (2 * 255);
                    const avgB = (tb * ta + bb * ba) / (2 * 255);
                    const lum = this._luminance(avgR, avgG, avgB);
                    const charIdx = Math.min(
                        ASCII_DENSITY.length - 1,
                        Math.floor(lum * ASCII_DENSITY.length),
                    );
                    screen.setCell(x + cellCol, y + cellRow, {
                        char: ASCII_DENSITY[charIdx],
                    });
                } else {
                    // TrueColor or ANSI256: use ▀ with fg=top, bg=bottom
                    // Apply alpha blending against black background
                    const topR = Math.round((tr * ta) / 255);
                    const topG = Math.round((tg * ta) / 255);
                    const topB = Math.round((tb * ta) / 255);
                    const botR = Math.round((br * ba) / 255);
                    const botG = Math.round((bg * ba) / 255);
                    const botB = Math.round((bb * ba) / 255);

                    const fgColor = this._rgbToColor(topR, topG, topB, mode);
                    const bgColor = this._rgbToColor(botR, botG, botB, mode);

                    screen.setCell(x + cellCol, y + cellRow, {
                        char: caps.unicode ? '\u2580' : '#',
                        fg: fgColor,
                        bg: bgColor,
                    });
                }
            }
        }
    }
}
