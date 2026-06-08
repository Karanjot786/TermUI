// ─────────────────────────────────────────────────────
// @termuijs/widgets — Timer widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface TimerOptions {
    /** Duration to count down from in milliseconds. */
    duration: number;
    /** Tick interval in milliseconds. Default: 1000. */
    interval?: number;
}

/**
 * Timer — counts down from a duration to zero.
 *
 * - Accepts `duration` in milliseconds.
 * - Exposes `start()`, `stop()`, and `reset()` methods.
 * - Fires `onComplete()` callback when it reaches zero.
 * - Renders as `MM:SS` for durations < 1 hour, `HH:MM:SS` for longer.
 * - Calls `this.markDirty()` on every tick so the render loop re-paints.
 * - Clears the interval on `stop()` and in `destroy()` to prevent leaks.
 */
export class Timer extends Widget {
    /** Duration to count down from (ms). */
    private _duration: number;

    /** Tick interval in ms (default 1000). */
    private _interval: number;

    /** Remaining time in ms. */
    private _remaining: number;

    /** Whether the timer is currently running. */
    private _running = false;

    /** Internal setInterval handle. */
    private _intervalId: ReturnType<typeof setInterval> | undefined;

    /**
     * Called when the countdown reaches zero.
     * Assign a function to this property to receive the event.
     *
     * @example
     * timer.onComplete = () => {};
     */
    onComplete: (() => void) | undefined;

    constructor(options: TimerOptions, style: Partial<Style> = {}) {
        super({ height: 1, ...style });
        this._duration = options.duration;
        this._interval = options.interval ?? 1000;
        this._remaining = options.duration;
    }

    // ── Public API ──────────────────────────────────────────────────────

    /** Start (or resume) the countdown. No-op if already running. */
    start(): void {
        if (this._running) return;
        if (this._remaining <= 0) return; // Already completed
        this._running = true;
        this._intervalId = setInterval(() => this._tick(), this._interval);
    }

    /** Pause the countdown. No-op if already stopped. */
    stop(): void {
        if (!this._running) return;
        this._running = false;
        this._clearInterval();
    }

    /**
     * Reset the remaining time back to the original duration and stop any
     * running countdown.
     */
    reset(): void {
        this.stop();
        this._remaining = this._duration;
        this.markDirty();
    }

    /** Returns `true` when the countdown has reached zero. */
    isComplete(): boolean {
        return this._remaining <= 0;
    }

    /** Returns the remaining time in milliseconds. */
    getRemaining(): number {
        return this._remaining;
    }

    /**
     * Release all resources held by this widget.
     * Call this when the widget is no longer needed to avoid timer leaks.
     */
    destroy(): void {
        this.stop();
        this._clearInterval();
    }

    // ── Lifecycle ───────────────────────────────────────────────────────

    /** Stop the interval when the widget is unmounted. */
    unmount(): void {
        this._clearInterval();
        super.unmount();
    }

    // ── Internal ────────────────────────────────────────────────────────

    /** Called on each interval tick. */
    private _tick(): void {
        this._remaining = Math.max(0, this._remaining - this._interval);
        this.markDirty();

        if (this._remaining <= 0) {
            this._running = false;
            this._clearInterval();
            this.onComplete?.();
        }
    }

    /** Safely clear the internal interval. */
    private _clearInterval(): void {
        if (this._intervalId !== undefined) {
            clearInterval(this._intervalId);
            this._intervalId = undefined;
        }
    }

    // ── Formatting ──────────────────────────────────────────────────────

    /**
     * Format milliseconds as `MM:SS` or `HH:MM:SS`.
     *
     * Chooses `HH:MM:SS` when the original duration is >= 1 hour (3600000 ms).
     */
    private _format(ms: number): string {
        const totalSeconds = Math.ceil(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const seconds = totalSeconds % 60;

        const ss = String(seconds).padStart(2, '0');

        if (this._duration >= 3_600_000) {
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const hh = String(hours).padStart(2, '0');
            const mm = String(minutes).padStart(2, '0');
            return `${hh}:${mm}:${ss}`;
        }

        // MM:SS branch: use total minutes (not modulo 3600) to avoid wrapping
        // when Math.ceil rounds up to exactly 3600 s on a sub-hour timer.
        const minutes = Math.floor(totalSeconds / 60);
        const mm = String(minutes).padStart(2, '0');
        return `${mm}:${ss}`;
    }

    // ── Rendering ───────────────────────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const label = this._format(this._remaining);

        screen.writeString(x, y, label, attrs);
    }
}
