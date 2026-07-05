// ─────────────────────────────────────────────────────
// @termuijs/ui — NumberInput widget
//
// A TextInput restricted to numeric values.
// - Only accepts digit keys and one decimal point
// - ↑ arrow increments value by step (default 1)
// - ↓ arrow decrements value by step
// - min/max clamping
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, styleToCellAttrs, truncate } from '@termuijs/core';

export interface NumberInputOptions {
    placeholder?: string;
    step?: number;
    min?: number;
    max?: number;
    allowDecimal?: boolean;
    onChange?: (value: number | null) => void;
    onSubmit?: (value: number | null) => void;
    signal?: AbortSignal;
}

export class NumberInput extends Widget {
    private _raw = '';          // raw string the user typed
    private _cursorPos = 0;
    private _placeholder: string;
    private _step: number;
    private _min: number;
    private _max: number;
    private _allowDecimal: boolean;
    private _onChange?: (value: number | null) => void;
    private _onSubmit?: (value: number | null) => void;
    private _onComplete?: (value: number | null) => void;
    focusable = true;
    public signal?: AbortSignal;

    constructor(
        style: Partial<Style> = {},
        options: NumberInputOptions = {},
    ) {
        super({ border: 'single', height: 3, ...style });
        this._placeholder = options.placeholder ?? '';
        this._step = options.step ?? 1;
        this._min = options.min ?? -Infinity;
        this._max = options.max ?? Infinity;
        this._allowDecimal = options.allowDecimal ?? true;
        this._onChange = options.onChange;
        this._onSubmit = options.onSubmit;
        this.signal = options.signal;
    }

    /** The numeric value, or null if the field is empty / invalid. */
    get numericValue(): number | null {
        if (this._raw === '' || this._raw === '-') return null;
        const n = parseFloat(this._raw);
        return isNaN(n) ? null : this._clamp(n);
    }

    /** Raw text string (what the user typed). */
    get rawValue(): string { return this._raw; }

    set rawValue(v: string) {
        this._raw = v;
        this._cursorPos = Math.min(this._cursorPos, this._raw.length);
        this._notify();
    }

    private _clamp(n: number): number {
        return Math.min(this._max, Math.max(this._min, n));
    }

    private _notify(): void {
        this._onChange?.(this.numericValue);
        this.markDirty();
    }

    /** Accept only digits, '-' at position 0 (if min < 0), and (optionally) one '.'. */
    private _isAllowed(char: string): boolean {
        // Only allow '-' at position 0 if min is negative
        if (char === '-' && this._cursorPos === 0 && !this._raw.includes('-')) {
            return this._min < 0;
        }
        if (char === '.' && this._allowDecimal && !this._raw.includes('.')) return true;
        return /^\d$/.test(char);
    }

    insertChar(char: string): void {
        if (!this._isAllowed(char)) return;
        this._raw =
            this._raw.slice(0, this._cursorPos) +
            char +
            this._raw.slice(this._cursorPos);
        this._cursorPos++;
        this._notify();
    }

    deleteBack(): void {
        if (this._cursorPos > 0) {
            this._raw =
                this._raw.slice(0, this._cursorPos - 1) +
                this._raw.slice(this._cursorPos);
            this._cursorPos--;
            this._notify();
        }
    }

    deleteForward(): void {
        if (this._cursorPos < this._raw.length) {
            this._raw =
                this._raw.slice(0, this._cursorPos) +
                this._raw.slice(this._cursorPos + 1);
            this._notify();
        }
    }

    moveCursorLeft(): void { this._cursorPos = Math.max(0, this._cursorPos - 1); this.markDirty(); }
    moveCursorRight(): void { this._cursorPos = Math.min(this._raw.length, this._cursorPos + 1); this.markDirty(); }
    moveCursorHome(): void { this._cursorPos = 0; this.markDirty(); }
    moveCursorEnd(): void { this._cursorPos = this._raw.length; this.markDirty(); }

    /** Increment value by step (↑ arrow). */
    increment(): void {
        const current = this.numericValue ?? 0;
        const next = this._clamp(current + this._step);
        this._raw = String(next);
        this._cursorPos = this._raw.length;
        this._notify();
    }

    /** Decrement value by step (↓ arrow). */
    decrement(): void {
        const current = this.numericValue ?? 0;
        const next = this._clamp(current - this._step);
        this._raw = String(next);
        this._cursorPos = this._raw.length;
        this._notify();
    }

    submit(): void { 
        this._onSubmit?.(this.numericValue); 
        this._onComplete?.(this.numericValue);
    }

    onComplete(cb: (value: number | null) => void): void {
        this._onComplete = cb;
    }
    clear(): void { this._raw = ''; this._cursorPos = 0; this._notify(); }

    /**
     * Handle key events. Call this from your input loop.
     */
    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up': this.increment(); break;
            case 'down': this.decrement(); break;
            case 'backspace': this.deleteBack(); break;
            case 'delete': this.deleteForward(); break;
            case 'left': this.moveCursorLeft(); break;
            case 'right': this.moveCursorRight(); break;
            case 'home': this.moveCursorHome(); break;
            case 'end': this.moveCursorEnd(); break;
            case 'return':
            case 'enter': this.submit(); break;
            default:
                if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
                    this.insertChar(event.key);
                }
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        if (this._raw.length === 0 && !this.isFocused) {
            screen.writeString(x, y, truncate(this._placeholder, width), { ...attrs, dim: true });
            return;
        }

        const display = this._raw;
        const visibleWidth = width - 1;
        let scrollX = 0;
        if (this._cursorPos > visibleWidth) {
            scrollX = this._cursorPos - visibleWidth;
        }

        const visibleText = display.slice(scrollX, scrollX + visibleWidth);
        screen.writeString(x, y, visibleText, attrs);

        if (this.isFocused) {
            const cursorScreenPos = x + this._cursorPos - scrollX;
            if (cursorScreenPos >= x && cursorScreenPos < x + width) {
                const cursorChar = this._cursorPos < display.length
                    ? display[this._cursorPos]
                    : ' ';
                screen.setCell(cursorScreenPos, y, {
                    char: cursorChar,
                    ...attrs,
                    inverse: true,
                });
            }
        }

        // Show step hint if focused and there's room
        if (this.isFocused && width > 8) {
            const hint = `±${this._step}`;
            screen.writeString(x + width - hint.length, y, hint, { ...attrs, dim: true });
        }
    }
}
