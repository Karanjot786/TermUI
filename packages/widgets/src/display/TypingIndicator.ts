// ─────────────────────────────────────────────────────
// @termuijs/widgets — TypingIndicator widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface TypingIndicatorOptions {
    /** Speed of the animation in milliseconds. Default: 300. */
    speedMs?: number;
    /** Text to display when motion is disabled. Default: "Typing..." */
    fallbackText?: string;
    /** Color of the indicator dots/text. Default: brightBlack. */
    color?: Color;
}

const FRAMES = ['', '.', '..', '...'];

/**
 * TypingIndicator — an animated indicator typically used in chat UIs.
 * 
 * - Cycles through an animation (e.g., `.`, `..`, `...`) on a timer.
 * - Respects `caps.motion`. If disabled, displays static `fallbackText`.
 */
export class TypingIndicator extends Widget {
    private _speedMs: number;
    private _fallbackText: string;
    private _color: Color;
    
    private _frameIndex = 0;
    private _running = false;
    private _intervalId: ReturnType<typeof setInterval> | undefined;

    constructor(style: Partial<Style> = {}, opts: TypingIndicatorOptions = {}) {
        super(style);
        this._speedMs = opts.speedMs ?? 300;
        this._fallbackText = opts.fallbackText ?? 'Typing...';
        this._color = opts.color ?? { type: 'named', name: 'brightBlack' };
    }

    /** Start the typing animation. */
    start(): void {
        if (this._running) return;
        this._running = true;

        if (!caps.motion) {
            this.markDirty();
            return;
        }

        this._intervalId = setInterval(() => this._tick(), this._speedMs);
        this.markDirty();
    }

    /** Stop the typing animation. */
    stop(): void {
        if (!this._running) return;
        this._running = false;
        this._clearInterval();
        this.markDirty();
    }

    /** Return true if currently running. */
    isRunning(): boolean {
        return this._running;
    }

    destroy(): void {
        this.stop();
        super.destroy();
    }

    unmount(): void {
        this.stop();
        super.unmount();
    }

    private _tick(): void {
        this._frameIndex = (this._frameIndex + 1) % FRAMES.length;
        this.markDirty();
    }

    private _clearInterval(): void {
        if (this._intervalId !== undefined) {
            clearInterval(this._intervalId);
            this._intervalId = undefined;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();
        if (width <= 0 || height <= 0) return;

        const attrs = { ...styleToCellAttrs(this._style), fg: this._color };

        if (!caps.motion) {
            // Render fallback if reduced motion is preferred
            const display = this._running ? this._fallbackText : '';
            const padded = display.padEnd(width, ' ');
            const len = Math.min(stringWidth(padded), width);
            screen.writeString(x, y, padded.slice(0, len), attrs);
            return;
        }

        const frame = this._running ? FRAMES[this._frameIndex] : '';
        const padded = frame.padEnd(3, ' ');
        const len = Math.min(stringWidth(padded), width);
        screen.writeString(x, y, padded.slice(0, len), attrs);
    }
}
