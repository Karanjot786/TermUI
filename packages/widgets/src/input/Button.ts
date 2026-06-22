// @termuijs/widgets - Button widget
import { type Screen, type Style, type Color, type KeyEvent, stringWidth, caps, prefersReducedMotion } from '@termuijs/core';
import { timerPoolSubscribe } from '@termuijs/motion';
import { Widget } from '../base/Widget.js';
import { SPINNER_FRAMES } from '../feedback/Spinner.js';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';

export interface ButtonOptions {
    variant?: ButtonVariant;
    disabled?: boolean;
    onPress?: () => void;
    color?: Color;
    loading?: boolean;
    loadingText?: string;
    animationMs?: number;
}

const LOADING_SPINNER = SPINNER_FRAMES.dots;

const BG_COLORS: Record<ButtonVariant, Color> = {
    default: { type: 'named', name: 'brightBlack' },
    primary: { type: 'named', name: 'blue' },
    danger: { type: 'named', name: 'red' },
    ghost: { type: 'named', name: 'brightBlack' },
};

const FG_COLORS: Record<ButtonVariant, Color> = {
    default: { type: 'named', name: 'white' },
    primary: { type: 'named', name: 'white' },
    danger: { type: 'named', name: 'white' },
    ghost: { type: 'named', name: 'white' },
};

const HOVER_BG_COLORS: Record<ButtonVariant, Color> = {
    default: { type: 'named', name: 'white' },
    primary: { type: 'named', name: 'cyan' },
    danger: { type: 'named', name: 'yellow' },
    ghost: { type: 'named', name: 'white' },
};

export class Button extends Widget {
    private _label: string;
    private _variant: ButtonVariant;
    private _disabled: boolean;
    private _onPress?: () => void;
    private _color?: Color;
    private _loading: boolean;
    private _loadingText?: string;
    private _frames: string[];
    private _interval: number;
    private _startTime?: number;
    private _timerUnsub?: () => void;
    private _animationMs: number;
    private _hoverStartTime: number | null = null;
    private _pressStartTime: number | null = null;
    private _animationTimer: ReturnType<typeof setTimeout> | null = null;
    private _wasFocused = false;

    constructor(label: string, style: Partial<Style> = {}, opts: ButtonOptions = {}) {
        super(style);
        this._label = label;
        this._variant = opts.variant ?? 'default';
        this._disabled = opts.disabled ?? false;
        this._onPress = opts.onPress;
        this._color = opts.color;
        this._loading = opts.loading ?? false;
        this._loadingText = opts.loadingText;
        this._frames = caps.unicode ? LOADING_SPINNER.frames : LOADING_SPINNER.asciiFrames;
        this._interval = LOADING_SPINNER.interval;
        this._animationMs = opts.animationMs ?? 200;
        this.focusable = true;
    }

    setLabel(label: string): void {
        if (this._label === label) return;
        this._label = label;
        this.markDirty();
    }

    setDisabled(disabled: boolean): void {
        if (this._disabled === disabled) return;
        this._disabled = disabled;
        this.markDirty();
    }

    setLoading(loading: boolean): void {
        if (this._loading === loading) return;
        this._loading = loading;
        this.markDirty();
        this._timerUnsub?.();
        this._timerUnsub = undefined;
        if (loading && !prefersReducedMotion()) {
            this._startTime = Date.now();
            this._timerUnsub = timerPoolSubscribe(this._interval, () => {
                this.markDirty();
            });
        }
    }

    setLoadingText(loadingText: string | undefined): void {
        this._loadingText = loadingText;
        if (this._loading) this.markDirty();
    }

    /** Call when button is hovered/focused to start hover animation */
    startHover(): void {
        if (prefersReducedMotion()) return;
        this._hoverStartTime = Date.now();
        this._scheduleAnimation();
    }

    /** Call when button hover/focus ends */
    endHover(): void {
        if (prefersReducedMotion()) return;
        this._hoverStartTime = null;
        this.markDirty();
    }

    /** Call when button is pressed to start press animation */
    startPress(): void {
        if (prefersReducedMotion()) return;
        this._pressStartTime = Date.now();
        this._scheduleAnimation();
    }

    private _scheduleAnimation(): void {
        if (this._animationTimer == null) {
            this._animationTimer = setTimeout(() => {
                this._animationTimer = null;
                this.markDirty();
            }, 16);
        }
    }

    private _getHoverProgress(): number {
        if (this._animationMs <= 0 || this._hoverStartTime === null) return 0;
        const elapsed = Date.now() - this._hoverStartTime;
        return Math.min(1, elapsed / this._animationMs);
    }

    private _getPressProgress(): number {
        if (this._animationMs <= 0 || this._pressStartTime === null) return 0;
        const elapsed = Date.now() - this._pressStartTime;
        const progress = elapsed / this._animationMs;
        if (progress >= 1) {
            this._pressStartTime = null;
            return 0;
        }
        return 1 - progress;
    }

    handleKey(event: KeyEvent): void {
        if (this._disabled || this._loading) return;
        if (event.key === 'enter' || event.key === 'space') {
            this.startPress();
            this._onPress?.();
        }
    }

    mount(): void {
        super.mount();
        if (this._loading && !prefersReducedMotion()) {
            this._timerUnsub?.();
            this._startTime = Date.now();
            this._timerUnsub = timerPoolSubscribe(this._interval, () => {
                this.markDirty();
            });
        }
    }

    unmount(): void {
        this._timerUnsub?.();
        this._timerUnsub = undefined;
        if (this._animationTimer !== null) {
            clearTimeout(this._animationTimer);
            this._animationTimer = null;
        }
        super.unmount();
    }

    private _currentFrame(): string {
        if (prefersReducedMotion() || this._startTime === undefined) return this._frames[0];
        const elapsed = Date.now() - this._startTime;
        const idx = Math.floor(elapsed / this._interval) % this._frames.length;
        return this._frames[idx];
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        if (this.isFocused && !this._wasFocused) {
            this.startHover();
        } else if (!this.isFocused && this._wasFocused) {
            this.endHover();
        }
        this._wasFocused = this.isFocused;

        const hoverProgress = this._getHoverProgress();
        const pressProgress = this._getPressProgress();
        const isAnimating = hoverProgress > 0 || pressProgress > 0;

        const bg = this._color ?? (this.isFocused || hoverProgress > 0
            ? HOVER_BG_COLORS[this._variant]
            : BG_COLORS[this._variant]);
        const fg = FG_COLORS[this._variant];

        const finalBg = pressProgress > 0 ? fg : bg;
        const finalFg = pressProgress > 0 ? bg : fg;

        const borderFg = this.isFocused
            ? { type: 'named' as const, name: 'cyan' as const }
            : finalFg;

        const tl = caps.unicode ? '\u250c' : '+';
        const tr = caps.unicode ? '\u2510' : '+';
        const bl = caps.unicode ? '\u2514' : '+';
        const br = caps.unicode ? '\u2518' : '+';
        const hz = caps.unicode ? '\u2500' : '-';
        const vt = caps.unicode ? '\u2502' : '|';

        const inner = width - 2;
        if (inner <= 0) return;

        const displayLabel = this._loading
            ? (this._loadingText ?? this._label)
            : this._label;

        const spinnerChar = this._loading ? this._currentFrame() + ' ' : '';
        const fullText = spinnerChar + displayLabel;
        const textWidth = stringWidth(fullText);
        const pad = Math.max(0, inner - textWidth);
        const leftPad = Math.floor(pad / 2);
        const rightPad = pad - leftPad;
        const centeredText = ' '.repeat(leftPad) + fullText + ' '.repeat(rightPad);

        const borderAttrs = { fg: borderFg, bg: finalBg, bold: this.isFocused };
        const textAttrs = { fg: finalFg, bg: finalBg, bold: this.isFocused };

        screen.writeString(x, y, tl + hz.repeat(inner) + tr, borderAttrs);

        if (height >= 2) {
            const mid = Math.floor(height / 2);
            for (let row = 1; row < height - 1; row++) {
                if (row === mid) {
                    screen.writeString(x, y + row, vt, borderAttrs);
                    screen.writeString(x + 1, y + row, centeredText.slice(0, inner), textAttrs);
                    screen.writeString(x + inner + 1, y + row, vt, borderAttrs);
                } else {
                    screen.writeString(x, y + row, vt + ' '.repeat(inner) + vt, borderAttrs);
                }
            }
        }

        if (height >= 2) {
            screen.writeString(x, y + height - 1, bl + hz.repeat(inner) + br, borderAttrs);
        }

        if (isAnimating && this._animationTimer == null) {
            this._animationTimer = setTimeout(() => {
                this._animationTimer = null;
                this.markDirty();
            }, 16);
        }
    }
}
