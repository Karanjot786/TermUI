// ─────────────────────────────────────────────────────
// @termuijs/widgets — Skeleton loading placeholder widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { timerPoolSubscribe } from '@termuijs/motion';

export interface SkeletonOptions {
    /** Animation style: 'pulse' alternates two chars; 'shimmer' scrolls a highlight band */
    variant?: 'pulse' | 'shimmer';
    /** Animation interval in ms (default: 600) */
    intervalMs?: number;
    /** Characters for pulse: [dim, bright]. Default: ['░', '▒'] (ASCII fallback: ['-', '#']) */
    chars?: [string, string];
    /** Color for the bright state (optional) */
    color?: Color;
}

/**
 * Skeleton — animated loading placeholder.
 *
 * Supports:
 * - 'pulse' variant: alternates between dim and bright fill characters
 * - 'shimmer' variant: scrolls a bright band (~20% width) across the widget
 * - Automatic ASCII fallback when unicode is unavailable
 * - No animation when caps.motion is false (static frame 0)
 */
export class Skeleton extends Widget {
    private _frame: number = 0;
    private _shimmerPos: number = 0;
    private _unsub?: () => void;
    private _chars: [string, string];
    private _variant: 'pulse' | 'shimmer';
    private _intervalMs: number;

    constructor(style: Partial<Style> = {}, options: SkeletonOptions = {}) {
        super(style);
        this._variant = options.variant ?? 'pulse';
        this._intervalMs = options.intervalMs ?? 600;

        // ASCII fallback when unicode not available
        const defaultChars: [string, string] = caps.unicode
            ? ['░', '▒']
            : ['-', '#'];
        this._chars = options.chars ?? defaultChars;

        // Only animate when motion is enabled
        if (caps.motion) {
            this._unsub = timerPoolSubscribe(this._intervalMs, () => {
                this._frame = 1 - this._frame;
                if (this._variant === 'shimmer') {
                    this._shimmerPos++;
                }
                this.markDirty();
            });
        }
    }

    override unmount(): void {
        this._unsub?.();
        this._unsub = undefined;
        super.unmount();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        if (this._variant === 'pulse') {
            const char = this._chars[this._frame];
            const dim = this._frame === 0;
            for (let row = y; row < y + height; row++) {
                for (let col = x; col < x + width; col++) {
                    screen.setCell(col, row, { char, dim, bold: false });
                }
            }
        } else {
            // Shimmer: moving band of bright char, rest dim
            const bandWidth = Math.max(1, Math.floor(width * 0.2));
            const totalPositions = width + bandWidth;
            const bandStart = this._shimmerPos % totalPositions;

            for (let row = y; row < y + height; row++) {
                for (let colOffset = 0; colOffset < width; colOffset++) {
                    const col = x + colOffset;
                    const inBand = colOffset >= bandStart && colOffset < bandStart + bandWidth;
                    const char = inBand ? this._chars[1] : this._chars[0];
                    screen.setCell(col, row, { char, dim: !inBand, bold: false });
                }
            }
        }
    }
}
