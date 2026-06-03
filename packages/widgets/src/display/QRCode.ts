import { Widget } from '../base/Widget.js';
import { type Style, caps } from '@termuijs/core';

export interface QRCodeOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    darkChar?: string;
    lightChar?: string;
}

const SIZE = 21;

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
}

export class QRCode extends Widget {
    private data: string;
    private opts: QRCodeOptions;

    constructor(data: string, style?: Partial<Style>, opts?: QRCodeOptions) {
        super(style);
        this.data = data;
        this.opts = opts ?? {};
    }

    setData(data: string): void {
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

  protected _renderSelf(): string {
    const dark = caps.unicode ? (this.opts.darkChar ?? '█') : '#';
    const light = caps.unicode ? (this.opts.lightChar ?? ' ') : ' ';

    const hash = hashString(this.data);

    let out = '';

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            let char: string;

            if (this.isFinder(x, y)) {
                char = this.renderFinder(x, y);
            } else {
                const bitIndex = (x * y + hash) % 32;
                const bit = (hash >> bitIndex) & 1;
                char = bit ? dark : light;
            }

            out += char;
        }
        out += '\n';
    }

    return out;
    }
}