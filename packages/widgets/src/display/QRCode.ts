import { Widget } from '../base/Widget.js';
import { type Screen, type Style, caps, styleToCellAttrs } from '@termuijs/core';

export interface QRCodePatternOptions {
    darkChar?: string;
    lightChar?: string;
    showText?: boolean;
}

export interface QRCodeOptions extends QRCodePatternOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

const SIZE = 21;

/**
 * Decorative QR-style pattern generator.
 * This widget is intentionally not a scannable QR code.
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
}

export class QRCodePattern extends Widget {
    private data: string;
    private opts: QRCodePatternOptions;

    constructor(data: string, style?: Partial<Style>, opts?: QRCodePatternOptions) {
        super(style);
        this.data = data;
        this.opts = opts ?? {};
    }

    setData(data: string): void {
        if(this.data === data) return;
        this.data = data;
        this.markDirty();
    }

    private isFinder(x: number, y: number): boolean {
        const inTopLeft = x < 7 && y < 7;
        const inTopRight = x > SIZE - 8 && y < 7;
        const inBottomLeft = x < 7 && y > SIZE - 8;

        return inTopLeft || inTopRight || inBottomLeft;
    }

    private renderFinder(x: number, y: number): string {
        const dark = caps.unicode ? (this.opts.darkChar ?? '█') : '#';
        const light = caps.unicode ? (this.opts.lightChar ?? ' ') : ' ';

        const dx = x % 7;
        const dy = y % 7;

        const border = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const center = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;

        return border || center ? dark : light;
    }

    protected _renderSelf(screen: Screen): void {
        const contentRect = this._getContentRect();
        const { x: baseX, y: baseY, width, height } = contentRect;
        if (width <= 0 || height <= 0) return;

        const dark = caps.unicode ? (this.opts.darkChar ?? '█') : '#';
        const light = caps.unicode ? (this.opts.lightChar ?? ' ') : ' ';
        const attrs = styleToCellAttrs(this._style);
        const hash = hashString(this.data);

        const drawWidth = Math.min(SIZE, width);
        const drawHeight = Math.min(SIZE, height);

        for (let row = 0; row < drawHeight; row++) {
            for (let col = 0; col < drawWidth; col++) {
                let char: string;
        
                if (this.isFinder(col, row)) {
                    char = this.renderFinder(col, row);
                } else {
                    const bitIndex = (col * row + hash) % 32;
                    const bit = (hash >> bitIndex) & 1;
                    char = bit ? dark : light;
                }
        
                screen.writeString(baseX + col, baseY + row, char, attrs);
            }
        }
        
        if (this.opts.showText && height > drawHeight) {
            screen.writeString(
                baseX,
                baseY + drawHeight,
                this.data.slice(0, width),
                attrs
            );
        }
    }
}


export const QRCode = QRCodePattern;