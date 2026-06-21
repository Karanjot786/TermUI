// ─────────────────────────────────────────────────────
// @termuijs/widgets — Button widget
// ─────────────────────────────────────────────────────

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
    /** Show a loading spinner and suppress activation while true (default: false) */
    loading?: boolean;
    /** Label to display while loading (e.g. "Submitting...") — falls back to the normal label if omitted */
    loadingText?: string;
}

const LOADING_SPINNER = SPINNER_FRAMES.dots;

/** Background colors for each variant */
const BG_COLORS: Record<ButtonVariant, Color> = {
    default: { type: 'named', name: 'brightBlack' },
    primary: { type: 'named', name: 'blue' },
    danger: { type: 'named', name: 'red' },
    ghost: { type: 'named', name: 'brightBlack' },
};

/** Foreground colors for each variant */
const FG_COLORS: Record<ButtonVariant, Color> = {
    default: { type: 'named', name: 'white' },
    primary: { type: 'named', name: 'white' },
    danger: { type: 'named', name: 'white' },
    ghost: { type: 'named', name: 'white' },
};

/**
 * Button — a pressable button with a label and visual variants.
 *
 * Renders a button with different visual styles based on variant.
 * Handles key events for activation when not disabled.
 */
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

    /** Toggle the loading state. While loading, the button shows a spinner and ignores activation. */
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

    /** Update the text shown while loading (e.g. "Submitting..."). */
    setLoadingText(loadingText: string | undefined): void {
        this._loadingText = loadingText;
        if (this._loading) this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (this._disabled || this._loading) return;

        if (event.key === 'enter' || event.key === 'space') {
            this._onPress?.();
        }
    }

    /** Lifecycle: start the spinner timer if mounted while already loading. */
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

    /** Lifecycle: stop the spinner timer. */
    unmount(): void {
        this._timerUnsub?.();
        this._timerUnsub = undefined;
        super.unmount();
    }

    /** Compute the current spinner frame character based on elapsed time. */
    private _currentFrame(): string {
        if (prefersReducedMotion() || this._startTime === undefined) return this._frames[0];
        const elapsed = Date.now() - this._startTime;
        const idx = Math.floor(elapsed / this._interval) % this._frames.length;
        return this._frames[idx];
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const bg = this._color ?? BG_COLORS[this._variant];
        const fg = FG_COLORS[this._variant];
        const borderFg = this.isFocused
            ? { type: 'named' as const, name: 'cyan' as const }
            : fg;

        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';
        const hz = caps.unicode ? '─' : '-';
        const vt = caps.unicode ? '│' : '|';

        // Padded text: " label " — swap in spinner + loading text while loading
        const displayLabel = this._loading
            ? `${this._currentFrame()} ${this._loadingText ?? this._label}`
            : this._label;
        const padded = ` ${displayLabel} `;
        const textWidth = stringWidth(padded);

        const innerWidth = Math.min(textWidth, Math.max(0, width - 2));

        if (height >= 1) {
            screen.setCell(x, y, { char: tl, fg: borderFg, bg });
            for (let c = 1; c <= innerWidth; c++) {
                screen.setCell(x + c, y, { char: hz, fg: borderFg, bg });
            }
            if (innerWidth + 1 < width) {
                screen.setCell(x + innerWidth + 1, y, { char: tr, fg: borderFg, bg });
            }
        }

        if (height >= 2) {
            screen.setCell(x, y + 1, { char: vt, fg: borderFg, bg });
            const startX = x + 1;
            const textStartX = startX + Math.floor((innerWidth - textWidth) / 2);
            screen.writeString(textStartX, y + 1, padded, { fg: borderFg, bg });
            for (let c = textStartX + textWidth; c < startX + innerWidth; c++) {
                screen.setCell(c, y + 1, { char: ' ', fg: borderFg, bg });
            }
            if (innerWidth + 1 < width) {
                screen.setCell(x + innerWidth + 1, y + 1, { char: vt, fg: borderFg, bg });
            }
        }

        if (height >= 3) {
            screen.setCell(x, y + 2, { char: bl, fg: borderFg, bg });
            for (let c = 1; c <= innerWidth; c++) {
                screen.setCell(x + c, y + 2, { char: hz, fg: borderFg, bg });
            }
            if (innerWidth + 1 < width) {
                screen.setCell(x + innerWidth + 1, y + 2, { char: br, fg: borderFg, bg });
            }
        }
    }
}
