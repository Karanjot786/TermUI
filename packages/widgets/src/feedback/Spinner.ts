// ─────────────────────────────────────────────────────
// @termuijs/widgets — Spinner widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, type Color, caps, BRAILLE_SPIN, prefersReducedMotion, stringWidth } from '@termuijs/core';
import { timerPoolSubscribe, fadeIn, fadeOut } from '@termuijs/motion';
import { Widget } from '../base/Widget.js';

/**
 * Built-in spinner frame sets.
 */
export const SPINNER_FRAMES: Record<string, { frames: string[]; asciiFrames: string[]; interval: number }> = {
    dots: {
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        asciiFrames: ['|', '/', '-', '\\'],
        interval: 80,
    },
    /**
     * Alias for `dots`. Uses the same braille character frames and interval.
     * Provided as a more semantically descriptive name when the intent is to
     * convey a "braille spinner" rather than a generic dots animation.
     */
    braille: {
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        asciiFrames: ['|', '/', '-', '\\'],
        interval: 80,
    },
    line: {
        frames: ['-', '\\', '|', '/'],
        asciiFrames: ['-', '\\', '|', '/'],
        interval: 130,
    },
    star: {
        frames: ['✶', '✸', '✹', '✺', '✹', '✷'],
        asciiFrames: ['*', 'o', '*', 'O'],
        interval: 70,
    },
    arc: {
        frames: ['◜', '◠', '◝', '◞', '◡', '◟'],
        asciiFrames: ['|', '/', '-', '\\'],
        interval: 100,
    },
    circle: {
        frames: ['◐', '◓', '◑', '◒'],
        asciiFrames: ['|', '/', '-', '\\'],
        interval: 120,
    },
    bounce: {
        frames: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
        asciiFrames: ['.', 'o', 'O', 'o'],
        interval: 120,
    },
    arrow: {
        frames: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
        asciiFrames: ['<', '^', '>', 'v'],
        interval: 100,
    },
    clock: {
        frames: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
        asciiFrames: ['|', '/', '-', '\\'],
        interval: 100,
    },
    bar: {
        frames: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'],
        asciiFrames: ['[ ]', '[= ]', '[== ]', '[===]'],
        interval: 100,
    },
    pulse: {
        frames: ['█', '▓', '▒', '░'],
        asciiFrames: ['#', '+', '-', '.'],
        interval: 100,
    },
};

export interface SpinnerOptions {
    /** Spinner preset name or custom frames */
    spinner?: string | { frames: string[]; interval: number };
    /** Spinner preset name (preferred option) */
    preset?: string;
    /**
     * Animation variant (dots, line, braille, etc.).
     * Equivalent to `preset` — provided for semantic clarity when callers
     * prefer to think of the choice as a visual "variant" rather than a
     * configuration preset. If both are supplied, `variant` takes precedence.
     */
    variant?: string;
    /** Text label displayed after the spinner */
    label?: string;
    /** Color for the spinner frames */
    color?: Color;
    /** Whether the spinner is active/animating (default: true) */
    active?: boolean;
    /** Text to display when active is false (e.g., '✓ Done') */
    doneText?: string;
    /** Custom frame interval in milliseconds */
    interval?: number;
    /**
     * Animation style:
     * - `'spin'` (default) — cycle through frames at the interval
     * - `'pulse'` — smoothly pulse a single character between dim and bright
     */
    animation?: 'spin' | 'pulse';
    /** Character to use when animation is `'pulse'`. Default: `'█'` (unicode) or `'#'` (ASCII) */
    pulseChar?: string;
}

/**
 * Spinner — animated loading indicator.
 *
 * Supports:
 * - 10 built-in spinner presets
 * - Custom frame sequences
 * - Configurable color and label
 * - Active state control and custom done state text
 * - Automatic frame advancement with system-clock smoothness
 * - ASCII fallbacks and no-motion environment support
 */
export class Spinner extends Widget {
    private _frames: string[];
    private _interval: number;
    private _frameIndex = 0;
    private _label: string;
    private _color: Color;
    private _elapsed = 0;
    private _timerUnsub?: () => void;

    private _active = true;
    private _doneText?: string;
    private _startTime?: number;
    private _animation: 'spin' | 'pulse';
    private _pulseChar: string;
    private _animProgress = 0.5;
    private _animCancel?: () => void;

    constructor(style: Partial<Style> = {}, options: SpinnerOptions = {}) {
        super({ height: 1, ...style });

        const presetName = options.variant ?? options.preset ?? (typeof options.spinner === 'string' ? options.spinner : undefined);
        const spinnerDef = presetName
            ? (SPINNER_FRAMES[presetName] ?? SPINNER_FRAMES.dots)
            : (typeof options.spinner === 'object' ? options.spinner : SPINNER_FRAMES.dots);

        // Frame interval selection with override option
        this._interval = options.interval ?? spinnerDef.interval;

        // Custom or preset frames
        let framesToUse = spinnerDef.frames;
        if (!caps.unicode) {
            if (presetName && SPINNER_FRAMES[presetName]?.asciiFrames) {
                framesToUse = SPINNER_FRAMES[presetName].asciiFrames;
            } else if (spinnerDef && 'asciiFrames' in spinnerDef && Array.isArray((spinnerDef as any).asciiFrames)) { // as any: asciiFrames is an optional SpinnerDef extension not in the base interface
                framesToUse = (spinnerDef as any).asciiFrames; // as any: asciiFrames is an optional SpinnerDef extension not in the base interface
            } else if (framesToUse.some(f => f.codePointAt(0)! > 127)) {
                // Generic fallback for custom unicode frames
                framesToUse = Array.from(BRAILLE_SPIN);
                this._interval = options.interval ?? 130;
            }
        }

        this._frames = framesToUse;
        this._label = options.label ?? '';
        this._color = options.color ?? { type: 'named', name: 'cyan' };
        this._active = options.active !== false;
        this._doneText = options.doneText;
        this._animation = options.animation ?? 'spin';
        this._pulseChar = options.pulseChar ?? (caps.unicode ? '█' : '#');
        this._animProgress = this._active ? 0.5 : 0;
    }

    /** Update the active state */
    setActive(active: boolean): void {
        if (this._active === active) return;
        this._active = active;
        this.markDirty();

        // Clean up existing timers/animations
        this._timerUnsub?.();
        this._timerUnsub = undefined;
        this._animCancel?.();
        this._animCancel = undefined;

        if (!active) return;
        if (prefersReducedMotion()) return;

        if (this._animation === 'pulse') {
            this._startPulse();
        } else {
            this._startTime = Date.now();
            this._timerUnsub = timerPoolSubscribe(this._interval, () => {
                this.markDirty();
            });
        }
    }

    /** Start the continuous pulse animation loop. */
    private _startPulse(): void {
        const pulseMs = this._interval * 2;
        const fadeInFn = () => {
            this._animCancel = fadeIn(pulseMs, (p) => {
                this._animProgress = p;
                this.markDirty();
            }, () => {
                this._animProgress = 1;
                const fadeOutFn = () => {
                    this._animCancel = fadeOut(pulseMs, (p) => {
                        this._animProgress = p;
                        this.markDirty();
                    }, () => {
                        this._animProgress = 0;
                        fadeInFn();
                    });
                };
                fadeOutFn();
            });
        };
        fadeInFn();
    }

    /** Update the spinner label */
    setLabel(label: string): void {
        this._label = label;
        this.markDirty();
    }

    /** Update doneText */
    setDoneText(doneText: string): void {
        this._doneText = doneText;
        this.markDirty();
    }

    /**
     * Advance the spinner frame based on elapsed time.
     * Call this with a delta (ms) from the render loop.
     * No-op in pulse mode (animation is driven by fadeIn/fadeOut).
     */
    tick(deltaMs: number): void {
        if (prefersReducedMotion() || !this._active || this._animation === 'pulse') return;

        this._elapsed += deltaMs;
        this._frameIndex = Math.floor(this._elapsed / this._interval) % this._frames.length;
    }

    /** Lifecycle: start the frame-advance timer or pulse animation (only when motion is enabled). */
    mount(): void {
        super.mount();
        if (prefersReducedMotion() || !this._active) return;
        if (this._animation === 'pulse') {
            this._startPulse();
        } else {
            this._startTime = Date.now();
            this._timerUnsub = timerPoolSubscribe(this._interval, () => {
                this.markDirty();
            });
        }
    }

    /** Lifecycle: stop the frame-advance timer and any running animation. */
    unmount(): void {
        this._timerUnsub?.();
        this._timerUnsub = undefined;
        this._animCancel?.();
        this._animCancel = undefined;
        super.unmount();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        let char = '';
        let dim = false;
        let bold = false;

        if (this._active) {
            if (this._animation === 'pulse') {
                if (prefersReducedMotion()) {
                    char = this._pulseChar;
                } else {
                    char = this._pulseChar;
                    const progress = this._animProgress;
                    dim = progress < 0.5;
                    bold = progress >= 0.5;
                }
            } else if (prefersReducedMotion()) {
                // Static fallback when motion is disabled
                char = '[...]';
            } else {
                let idx = this._frameIndex;
                if (this._startTime !== undefined) {
                    const elapsed = Date.now() - this._startTime;
                    idx = Math.floor(elapsed / this._interval) % this._frames.length;
                }
                char = this._frames[idx];
            }
        } else {
            char = this._doneText ?? '';
        }

        // Render spinner character or doneText
        if (char) {
            screen.writeString(x, y, char, { ...attrs, fg: this._color, dim, bold });
        }

        // Render label
        if (this._label) {
            const labelX = char ? x + stringWidth(char) + 1 : x;
            screen.writeString(labelX, y, this._label, attrs);
        }
    }
}
