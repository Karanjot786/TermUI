// ─────────────────────────────────────────────────────
// @termuijs/widgets — Spinner widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, type Color, caps, BRAILLE_SPIN } from '@termuijs/core';
import { timerPoolSubscribe } from '@termuijs/motion';
import { Widget } from '../base/Widget.js';

/**
 * Built-in spinner frame sets.
 */
export const SPINNER_FRAMES: Record<string, { frames: string[]; interval: number }> = {
    dots: {
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        interval: 80,
    },
    line: {
        frames: ['-', '\\', '|', '/'],
        interval: 130,
    },
    star: {
        frames: ['✶', '✸', '✹', '✺', '✹', '✷'],
        interval: 70,
    },
    arc: {
        frames: ['◜', '◠', '◝', '◞', '◡', '◟'],
        interval: 100,
    },
    circle: {
        frames: ['◐', '◓', '◑', '◒'],
        interval: 120,
    },
    bounce: {
        frames: ['⠁', '⠂', '⠄', '⠂'],
        interval: 120,
    },
    arrow: {
        frames: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
        interval: 100,
    },
    clock: {
        frames: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
        interval: 100,
    },
};

export interface SpinnerOptions {
    /** Spinner preset name or custom frames */
    spinner?: string | { frames: string[]; interval: number };
    /** Text label displayed after the spinner */
    label?: string;
    /** Color for the spinner frames */
    color?: Color;
}

/**
 * Spinner — animated loading indicator.
 *
 * Supports:
 * - 8 built-in spinner presets
 * - Custom frame sequences
 * - Configurable color and label
 * - Automatic frame advancement via tick()
 */
export class Spinner extends Widget {
    private _frames: string[];
    private _interval: number;
    private _frameIndex = 0;
    private _label: string;
    private _color: Color;
    private _lastTick = 0;
    private _elapsed = 0;
    private _timerUnsub?: () => void;

    constructor(style: Partial<Style> = {}, options: SpinnerOptions = {}) {
        super({ height: 1, ...style });

        const spinnerDef = typeof options.spinner === 'string'
            ? (SPINNER_FRAMES[options.spinner] ?? SPINNER_FRAMES.dots)
            : (options.spinner ?? SPINNER_FRAMES.dots);

        this._frames = spinnerDef.frames;
        this._interval = spinnerDef.interval;
        this._label = options.label ?? '';
        this._color = options.color ?? { type: 'named', name: 'cyan' };

        if (!caps.unicode && this._frames.some(f => f.codePointAt(0)! > 127)) {
            this._frames = Array.from(BRAILLE_SPIN);
            this._interval = 130; // match 'line' spinner speed
        }
    }

    /** Update the spinner label */
    setLabel(label: string): void {
        this._label = label;
    }

    /**
     * Advance the spinner frame based on elapsed time.
     * Call this with a delta (ms) from the render loop.
     */
    tick(deltaMs: number): void {
        if (!caps.motion) return;

        this._elapsed += deltaMs;
        if (this._elapsed >= this._interval) {
            this._frameIndex = (this._frameIndex + 1) % this._frames.length;
            this._elapsed = 0;
        }
    }

    /** Lifecycle: start the frame-advance timer (only when motion is enabled). */
    mount(): void {
        super.mount();
        if (!caps.motion) return;
        this._timerUnsub = timerPoolSubscribe(this._interval, () => {
            this._frameIndex = (this._frameIndex + 1) % this._frames.length;
            this.markDirty();
        });
    }

    /** Lifecycle: stop the frame-advance timer. */
    unmount(): void {
        this._timerUnsub?.();
        this._timerUnsub = undefined;
        super.unmount();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const frame = this._frames[this._frameIndex];

        // Render spinner character
        screen.writeString(x, y, frame, { ...attrs, fg: this._color });

        // Render label
        if (this._label) {
            screen.writeString(x + 2, y, this._label, attrs);
        }
    }
}
