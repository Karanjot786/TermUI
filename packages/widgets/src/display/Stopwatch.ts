// ─────────────────────────────────────────────────────
// @termuijs/widgets — Stopwatch widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface StopwatchOptions {
    /** Tick interval in milliseconds. Default: 10 (for centisecond precision). */
    interval?: number;
}

/**
 * Stopwatch — counts up from zero, displaying elapsed time.
 *
 * - Exposes `start()`, `stop()`, and `reset()` methods.
 * - Renders elapsed time as `MM:SS.ms` (e.g. `01:23.45`).
 * - Calls `this.markDirty()` on every tick so the render loop re-paints.
 * - Clears the interval on `stop()` and in `destroy()` to prevent leaks.
 */
export class Stopwatch extends Widget {
    /** Accumulated elapsed time in ms (from prior start/stop cycles). */
    private _elapsed = 0;

    /** Timestamp (Date.now()) when the current run started, or undefined if stopped. */
    private _startTime: number | undefined;

    /** Tick interval in ms (default 10). */
    private _interval: number;

    /** Whether the stopwatch is currently running. */
    private _running = false;

    /** Internal setInterval handle. */
    private _intervalId: ReturnType<typeof setInterval> | undefined;

    constructor(options: StopwatchOptions = {}, style: Partial<Style> = {}) {
        super({ height: 1, ...style });
        this._interval = options.interval ?? 10;
    }

    // ── Public API ──────────────────────────────────────────────────────

    /** Start (or resume) the stopwatch. No-op if already running. */
    start(): void {
        if (this._running) return;
        this._running = true;
        this._startTime = Date.now();
        this._intervalId = setInterval(() => this._tick(), this._interval);
    }

    /** Pause the stopwatch. No-op if already stopped. */
    stop(): void {
        if (!this._running) return;
        // Accumulate the elapsed time from the current run before stopping.
        if (this._startTime !== undefined) {
            this._elapsed += Date.now() - this._startTime;
            this._startTime = undefined;
        }
        this._running = false;
        this._clearInterval();
        this.markDirty();
    }

    /** Reset elapsed time to zero and stop the stopwatch. */
    reset(): void {
        this.stop();
        this._elapsed = 0;
        this._startTime = undefined;
        this.markDirty();
    }

    /** Returns the total elapsed milliseconds (including current run). */
    getElapsed(): number {
        if (this._running && this._startTime !== undefined) {
            return this._elapsed + (Date.now() - this._startTime);
        }
        return this._elapsed;
    }

    /** Returns `true` when the stopwatch is currently running. */
    isRunning(): boolean {
        return this._running;
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
        this.markDirty();
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
     * Format milliseconds as `MM:SS.ms`.
     *
     * The `.ms` portion shows centiseconds (hundredths of a second).
     * Example: 75423 ms → `01:15.42`
     */
    private _format(ms: number): string {
        const totalCs = Math.floor(ms / 10);   // centiseconds
        const cs = totalCs % 100;
        const totalSeconds = Math.floor(totalCs / 100);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        const msStr = String(cs).padStart(2, '0');

        return `${mm}:${ss}.${msStr}`;
    }

    // ── Rendering ───────────────────────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const label = this._format(this.getElapsed());

        screen.writeString(x, y, label, attrs);
    }

    setInterval(interval: number): void {
        if (interval === this._interval) return;
    
        this._interval = interval;
    
        if (this._running) {
            this._clearInterval();
            this._intervalId = setInterval(() => this._tick(), this._interval);
        }
    
        this.markDirty();
    }
    
    getInterval(): number {
        return this._interval;
    }

}
