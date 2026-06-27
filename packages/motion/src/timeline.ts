// ─────────────────────────────────────────────────────
// @termuijs/motion — Timeline
//
// Orchestrates multiple animations along a shared time
// axis. Supports synced sub-timelines, callback markers,
// looping, and alternate (ping-pong) playback.
// ─────────────────────────────────────────────────────

import { subscribe } from './timer-pool.js';
import type { AnimatableValue } from './sequence.js';

// Abstracted time source — replaced by virtual clock in tests via setTimeSource()
let _timeNow: () => number = () => Date.now();

/**
 * Override the time source used by all Timeline instances.
 * Called internally by the timer pool when a VirtualClock is injected.
 * @internal
 */
export function _setTimeSource(fn: () => number): void {
    _timeNow = fn;
}

// ── Types ─────────────────────────────────────────────

export interface TimelineTrack {
    /** Target object whose properties are animated */
    target: Record<string, AnimatableValue>;
    /** Map of prop → [from, to] */
    props: Record<string, [AnimatableValue, AnimatableValue]>;
    /** Duration of this track in ms */
    duration: number;
    /** Offset (ms) from the timeline start */
    offsetMs: number;
    /** Easing function (0→1 progress → 0→1 output) */
    easing: (t: number) => number;
}

export interface CallbackMarker {
    atMs: number;
    fn: () => void;
    /** true once fired in the current pass */
    fired: boolean;
}

export interface SyncedTimeline {
    timeline: Timeline;
    offsetMs: number;
}

export interface TimelineOptions {
    /** Loop indefinitely. Default: false */
    loop?: boolean;
    /** Ping-pong direction after each pass. Requires loop: true. Default: false */
    alternate?: boolean;
    /** Total duration override in ms. Derived from tracks if omitted. */
    duration?: number;
}

// ── Timeline ──────────────────────────────────────────

export class Timeline {
    private _tracks: TimelineTrack[] = [];
    private _markers: CallbackMarker[] = [];
    private _synced: SyncedTimeline[] = [];

    private _options: Required<TimelineOptions>;
    private _elapsed = 0;
    private _playing = false;
    private _forward = true; // direction for alternate mode
    private _lastTick = 0;
    private _unsub: (() => void) | null = null;
    private _passCount = 0; // how many full passes completed

    constructor(options: TimelineOptions = {}) {
        this._options = {
            loop: options.loop ?? false,
            alternate: options.alternate ?? false,
            duration: options.duration ?? 0,
        };
    }

    // ── Public API ──────────────────────────────────

    /**
     * Add an animated track to the timeline.
     *
     * @param target   Object whose properties will be mutated.
     * @param props    Map of propName → [fromValue, toValue].
     * @param opts     duration (ms), offsetMs, easing.
     */
    add(
        target: Record<string, AnimatableValue>,
        props: Record<string, [AnimatableValue, AnimatableValue]>,
        opts: { duration: number; offsetMs?: number; easing?: (t: number) => number },
    ): this {
        this._tracks.push({
            target,
            props,
            duration: opts.duration,
            offsetMs: opts.offsetMs ?? 0,
            easing: opts.easing ?? ((t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
        });
        return this;
    }

    /**
     * Register a callback to fire at an exact millisecond mark.
     *
     * @param fn    Function to call.
     * @param atMs  Timeline position (ms) at which to fire.
     */
    call(fn: () => void, atMs: number): this {
        this._markers.push({ fn, atMs, fired: false });
        return this;
    }

    /**
     * Lock a sub-timeline to start at `offsetMs` into this timeline.
     *
     * @param sub       Another Timeline instance.
     * @param offsetMs  Start offset within this timeline (ms).
     */
    sync(sub: Timeline, offsetMs: number): this {
        this._synced.push({ timeline: sub, offsetMs });
        return this;
    }

    /** Start or resume playback. Auto-subscribes to the timer pool. */
    play(): void {
        if (this._playing) return;
        this._playing = true;
        this._lastTick = _timeNow();
        this._unsub = subscribe(16, () => this._tick());
    }

    /** Pause playback without resetting position. */
    pause(): void {
        if (!this._playing) return;
        this._playing = false;
        this._unsub?.();
        this._unsub = null;
    }

    /** Stop playback and reset to the beginning. */
    stop(): void {
        this.pause();
        this._elapsed = 0;
        this._forward = true;
        this._passCount = 0;
        this._resetMarkers();
        // Reset synced sub-timelines too
        for (const { timeline } of this._synced) {
            timeline.stop();
        }
    }

    /** Total duration of the timeline in ms (derived from tracks if not set). */
    get duration(): number {
        if (this._options.duration > 0) return this._options.duration;
        let max = 0;
        for (const t of this._tracks) {
            max = Math.max(max, t.offsetMs + t.duration);
        }
        for (const { timeline, offsetMs } of this._synced) {
            max = Math.max(max, offsetMs + timeline.duration);
        }
        return max || 0;
    }

    /** Current elapsed time in ms within the current pass. */
    get elapsed(): number {
        return this._elapsed;
    }

    /** Whether the timeline is currently playing. */
    get playing(): boolean {
        return this._playing;
    }

    // ── Internal ────────────────────────────────────

    private _tick(): void {
        const now = _timeNow();
        const delta = now - this._lastTick;
        this._lastTick = now;

        const total = this.duration;
        if (total <= 0) return;

        // Advance elapsed in the current direction
        if (this._forward) {
            this._elapsed = Math.min(this._elapsed + delta, total);
        } else {
            this._elapsed = Math.max(this._elapsed - delta, 0);
        }

        // Apply tracks at the current position
        this._applyTracks(this._elapsed);

        // Drive synced sub-timelines
        for (const { timeline, offsetMs } of this._synced) {
            const subElapsed = Math.max(0, this._elapsed - offsetMs);
            timeline._seekTo(subElapsed);
        }

        // Fire callback markers
        this._fireMarkers(this._elapsed);

        // Check for pass completion
        const passComplete = this._forward
            ? this._elapsed >= total
            : this._elapsed <= 0;

        if (passComplete) {
            this._passCount++;
            if (this._options.loop) {
                if (this._options.alternate) {
                    // Ping-pong: reverse direction
                    this._forward = !this._forward;
                } else {
                    // Standard loop: jump back to start
                    this._elapsed = 0;
                }
                this._resetMarkers();
            } else {
                // Non-looping: clamp to boundary and stop regardless of alternate
                this._elapsed = this._forward ? total : 0;
                this._applyTracks(this._elapsed);
                this._forward = true; // reset direction for next play()
                this.pause();
            }
        }
    }

    /**
     * Seek the timeline to a specific position (ms).
     * Used internally by parent timelines driving synced children.
     */
    _seekTo(ms: number): void {
        const total = this.duration;
        if (total <= 0) return;
        this._elapsed = Math.max(0, Math.min(ms, total));
        this._applyTracks(this._elapsed);
        this._fireMarkers(this._elapsed);
    }

    private _applyTracks(elapsed: number): void {
        for (const track of this._tracks) {
            const localT = elapsed - track.offsetMs;
            if (localT < 0 || track.duration <= 0) continue;

            const raw = Math.min(localT / track.duration, 1);
            // Clamp: at raw===1 always snap to exact 'to' value regardless of easing
            const t = raw >= 1 ? 1 : track.easing(raw);

            for (const [prop, [from, to]] of Object.entries(track.props)) {
                if (typeof from === 'number' && typeof to === 'number') {
                    track.target[prop] = t >= 1 ? to : from + (to - from) * t;
                } else {
                    // String values: snap at t >= 1
                    track.target[prop] = t >= 1 ? to : from;
                }
            }
        }
    }

    private _fireMarkers(elapsed: number): void {
        for (const marker of this._markers) {
            if (!marker.fired && elapsed >= marker.atMs) {
                marker.fired = true;
                marker.fn();
            }
        }
    }

    private _resetMarkers(): void {
        for (const marker of this._markers) {
            marker.fired = false;
        }
    }
}