import { type Screen, type Style, type Color, caps, prefersReducedMotion } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { timerPoolSubscribe } from '@termuijs/motion';

export interface SkeletonOptions {
    variant?: 'pulse' | 'shimmer';
    speed?: 'slow' | 'normal' | 'fast';
    shape?: 'text' | 'card' | 'table' | 'list';
    intervalMs?: number;
    chars?: [string, string];
    color?: Color;
}

export class Skeleton extends Widget {
    private _frame = 0;
    private _shimmerPos = 0;
    private _variant: 'pulse' | 'shimmer';
    private _shape: 'text' | 'card' | 'table' | 'list';
    private _chars: [string, string];
    private _intervalMs: number;
    private _unsubscribe?: () => void;

    constructor(style: Partial<Style> = {}, opts: SkeletonOptions = {}) {
        super(style);

        this._variant = opts.variant ?? 'pulse';
        this._shape = opts.shape ?? 'text';

        const speeds = { slow: 1000, normal: 600, fast: 300 };
        this._intervalMs = opts.intervalMs ?? speeds[opts.speed ?? 'normal'];

        this._chars = opts.chars ?? (caps.unicode ? ['░', '▒'] : ['-', '#']);

        if (!prefersReducedMotion()) {
            this._unsubscribe = timerPoolSubscribe(this._intervalMs, () => {
                this._frame = 1 - this._frame;
                this._shimmerPos++;
                this.markDirty();
            });
        }
    }

    override unmount(): void {
        this._unsubscribe?.();
        super.unmount();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;

        let height = rect.height;
        if (this._shape === 'text') height = Math.min(height, 3);
        else if (this._shape === 'list') height = Math.min(height, 5);
        else if (this._shape === 'table') height = Math.min(height, 6);

        if (width <= 0 || height <= 0) return;

        if (this._variant === 'pulse') {
            const char = this._chars[this._frame];

            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    screen.setCell(x + c, y + r, {
                        char,
                        dim: this._frame === 0,
                    });
                }
            }
        } else {
            const band = Math.max(1, Math.floor(width * 0.2));
            const total = width + band;
            const start = this._shimmerPos % total;

            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    const inBand = c >= start && c < start + band;
                    screen.setCell(x + c, y + r, {
                        char: inBand ? this._chars[1] : this._chars[0],
                        dim: !inBand,
                    });
                }
            }
        }
    }
}