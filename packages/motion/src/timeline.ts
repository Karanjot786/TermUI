// ─────────────────────────────────────────────────────
// @termuijs/motion — Multi-Track Keyframe Timeline
// ─────────────────────────────────────────────────────

import { easings, type EasingFn } from './transitions.js';
import { subscribe, type UnsubscribeFn } from './timer-pool.js';

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | EasingFn;

export interface Keyframe<T = number> {
    /** Time in milliseconds, or relative offset string like '+=200ms', '-=100ms' */
    time: number | string;
    /** Target property value */
    value: T;
    /** Easing curve for transition to this keyframe */
    easing?: EasingType;
}

export interface ParsedKeyframe<T = number> {
    timeMs: number;
    value: T;
    easing: EasingType;
}

export interface KeyframeTrack<T = number> {
    target: Record<string, any>;
    property: string;
    keyframes: Keyframe<T>[];
    parsedKeyframes: ParsedKeyframe<T>[];
}

export interface TimelineOptions {
    /** Total timeline duration in milliseconds. If omitted, calculated from keyframes. */
    duration?: number;
    /** Loop playback when reaching end. Default false. */
    loop?: boolean;
    /** Playback rate multiplier. Default 1.0. */
    playbackRate?: number;
    /** Callback fired on every timing frame update */
    onUpdate?: (progress: number, timeMs: number) => void;
    /** Callback fired when timeline completes execution */
    onComplete?: () => void;
    /** Callback fired when timeline loops */
    onLoop?: (loopCount: number) => void;
}

/**
 * Parses time values which can be absolute numbers (ms) or relative offset strings like '+=200ms', '-=100ms', '+=500'.
 */
export function parseTimeOffset(time: number | string, baseTimeMs: number): number {
    if (typeof time === 'number') {
        return Math.max(0, time);
    }

    const trimmed = time.trim();
    const match = trimmed.match(/^([+-]=)?\s*(-?\d+(?:\.\d+)?)\s*(ms|s)?$/i);
    if (!match) {
        const parsedNum = Number(trimmed);
        if (!isNaN(parsedNum)) {
            return Math.max(0, parsedNum);
        }
        throw new Error(`Invalid keyframe time format: "${time}"`);
    }

    const isRelative = Boolean(match[1]);
    const rawVal = parseFloat(match[2]);
    const unit = (match[3] || 'ms').toLowerCase();
    const valMs = unit === 's' ? rawVal * 1000 : rawVal;

    if (isRelative) {
        const sign = match[1].startsWith('-') ? -1 : 1;
        return Math.max(0, baseTimeMs + sign * valMs);
    }

    return Math.max(0, valMs);
}

function resolveEasingFn(easing?: EasingType): EasingFn {
    if (typeof easing === 'function') {
        return easing;
    }
    if (easing && easing in easings) {
        return easings[easing as keyof typeof easings];
    }
    return easings.linear;
}

export class KeyframeTimeline {
    private _tracks: KeyframeTrack<any>[] = [];
    private _currentTimeMs = 0;
    private _durationMs = 0;
    private _customDuration?: number;
    private _isPlaying = false;
    private _isReversed = false;
    private _playbackRate = 1.0;
    private _loop = false;
    private _loopCount = 0;
    private _unsubscribeTimer?: UnsubscribeFn;

    private _onUpdate?: (progress: number, timeMs: number) => void;
    private _onComplete?: () => void;
    private _onLoop?: (loopCount: number) => void;

    constructor(options: TimelineOptions = {}) {
        this._customDuration = options.duration;
        this._loop = options.loop ?? false;
        this._playbackRate = options.playbackRate ?? 1.0;
        this._onUpdate = options.onUpdate;
        this._onComplete = options.onComplete;
        this._onLoop = options.onLoop;
    }

    /**
     * Add an animation keyframe track for a specific object property.
     */
    addTrack<T = number>(target: Record<string, any>, property: string, keyframes: Keyframe<T>[]): this {
        if (!target || typeof target !== 'object') {
            throw new Error('Target must be a valid object');
        }
        if (!property) {
            throw new Error('Property name is required');
        }
        if (!Array.isArray(keyframes) || keyframes.length === 0) {
            throw new Error('Keyframes array must not be empty');
        }

        let previousTimeMs = 0;
        const parsedKeyframes: ParsedKeyframe<T>[] = [];

        for (const kf of keyframes) {
            const timeMs = parseTimeOffset(kf.time, previousTimeMs);
            parsedKeyframes.push({
                timeMs,
                value: kf.value,
                easing: kf.easing ?? 'linear',
            });
            previousTimeMs = timeMs;
        }

        parsedKeyframes.sort((a, b) => a.timeMs - b.timeMs);

        this._tracks.push({
            target,
            property,
            keyframes: [...keyframes],
            parsedKeyframes,
        });

        this._recalculateDuration();
        this._evaluateTracks(this._currentTimeMs);
        return this;
    }

    private _recalculateDuration(): void {
        if (typeof this._customDuration === 'number') {
            this._durationMs = this._customDuration;
            return;
        }

        let maxTime = 0;
        for (const track of this._tracks) {
            if (track.parsedKeyframes.length > 0) {
                const lastKf = track.parsedKeyframes[track.parsedKeyframes.length - 1];
                if (lastKf.timeMs > maxTime) {
                    maxTime = lastKf.timeMs;
                }
            }
        }
        this._durationMs = maxTime;
    }

    /**
     * Start playing the timeline.
     */
    play(): this {
        if (this._isPlaying) return this;

        if (!this._isReversed && this._currentTimeMs >= this._durationMs) {
            this._currentTimeMs = 0;
        } else if (this._isReversed && this._currentTimeMs <= 0) {
            this._currentTimeMs = this._durationMs;
        }

        this._isPlaying = true;
        this._startTimer();
        return this;
    }

    /**
     * Pause playback.
     */
    pause(): this {
        this._isPlaying = false;
        this._stopTimer();
        return this;
    }

    /**
     * Stop playback and reset to start position.
     */
    stop(): this {
        this.pause();
        this.seek(this._isReversed ? this._durationMs : 0);
        return this;
    }

    /**
     * Reverse playback direction.
     */
    reverse(): this {
        this._isReversed = !this._isReversed;
        return this;
    }

    /**
     * Seek directly to a specific time offset in milliseconds.
     */
    seek(timeMs: number): this {
        const clamped = Math.max(0, Math.min(this._durationMs, timeMs));
        this._currentTimeMs = clamped;
        this._evaluateTracks(this._currentTimeMs);
        this._notifyUpdate();
        return this;
    }

    /**
     * Set playback rate speed multiplier.
     */
    setPlaybackRate(rate: number): this {
        if (rate <= 0 || isNaN(rate)) {
            throw new Error('Playback rate must be a positive number');
        }
        this._playbackRate = rate;
        return this;
    }

    /**
     * Advance the timeline clock by a specified delta milliseconds.
     */
    tick(deltaMs: number): void {
        if (this._durationMs === 0) return;

        const effectiveDelta = deltaMs * this._playbackRate;

        if (this._isReversed) {
            this._currentTimeMs -= effectiveDelta;
            if (this._currentTimeMs <= 0) {
                if (this._loop) {
                    this._loopCount++;
                    this._currentTimeMs = (this._currentTimeMs % this._durationMs) + this._durationMs;
                    this._evaluateTracks(this._currentTimeMs);
                    this._notifyUpdate();
                    this._onLoop?.(this._loopCount);
                } else {
                    this._currentTimeMs = 0;
                    this._evaluateTracks(this._currentTimeMs);
                    this._notifyUpdate();
                    this.pause();
                    this._onComplete?.();
                }
                return;
            }
        } else {
            this._currentTimeMs += effectiveDelta;
            if (this._currentTimeMs >= this._durationMs) {
                if (this._loop) {
                    this._loopCount++;
                    this._currentTimeMs = this._currentTimeMs % this._durationMs;
                    this._evaluateTracks(this._currentTimeMs);
                    this._notifyUpdate();
                    this._onLoop?.(this._loopCount);
                } else {
                    this._currentTimeMs = this._durationMs;
                    this._evaluateTracks(this._currentTimeMs);
                    this._notifyUpdate();
                    this.pause();
                    this._onComplete?.();
                }
                return;
            }
        }

        this._evaluateTracks(this._currentTimeMs);
        this._notifyUpdate();
    }

    private _evaluateTracks(timeMs: number): void {
        for (const track of this._tracks) {
            const val = this._interpolateTrackValue(track, timeMs);
            track.target[track.property] = val;
        }
    }

    private _interpolateTrackValue(track: KeyframeTrack<any>, timeMs: number): any {
        const kfs = track.parsedKeyframes;
        if (kfs.length === 0) return undefined;
        if (kfs.length === 1 || timeMs <= kfs[0].timeMs) {
            return kfs[0].value;
        }

        const lastKf = kfs[kfs.length - 1];
        if (timeMs >= lastKf.timeMs) {
            return lastKf.value;
        }

        let prevIdx = 0;
        for (let i = 0; i < kfs.length; i++) {
            if (kfs[i].timeMs <= timeMs) {
                prevIdx = i;
            } else {
                break;
            }
        }

        const prevKf = kfs[prevIdx];
        const nextKf = kfs[prevIdx + 1];

        if (!nextKf) return prevKf.value;

        const duration = nextKf.timeMs - prevKf.timeMs;
        if (duration <= 0) return nextKf.value;

        const elapsed = timeMs - prevKf.timeMs;
        const progress = elapsed / duration;

        const easingFn = resolveEasingFn(nextKf.easing);
        const easedProgress = easingFn(Math.max(0, Math.min(1, progress)));

        if (typeof prevKf.value === 'number' && typeof nextKf.value === 'number') {
            return prevKf.value + (nextKf.value - prevKf.value) * easedProgress;
        }

        return easedProgress >= 1 ? nextKf.value : prevKf.value;
    }

    private _notifyUpdate(): void {
        const progress = this._durationMs > 0 ? this._currentTimeMs / this._durationMs : 1;
        this._onUpdate?.(progress, this._currentTimeMs);
    }

    private _startTimer(): void {
        if (this._unsubscribeTimer) return;
        let lastTime = Date.now();

        this._unsubscribeTimer = subscribe(16, () => {
            const now = Date.now();
            const deltaMs = now - lastTime;
            lastTime = now;
            if (this._isPlaying) {
                this.tick(deltaMs);
            }
        });
    }

    private _stopTimer(): void {
        if (this._unsubscribeTimer) {
            this._unsubscribeTimer();
            this._unsubscribeTimer = undefined;
        }
    }

    // Getters
    get currentTime(): number {
        return this._currentTimeMs;
    }

    get duration(): number {
        return this._durationMs;
    }

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    get isReversed(): boolean {
        return this._isReversed;
    }

    get playbackRate(): number {
        return this._playbackRate;
    }

    get tracks(): KeyframeTrack<any>[] {
        return [...this._tracks];
    }
}
