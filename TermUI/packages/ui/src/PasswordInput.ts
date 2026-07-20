// ─────────────────────────────────────────────────────
// @termuijs/ui — PasswordInput widget
//
// A TextInput with character masking. Shows '●' (or '*'
// in ASCII terminals) per character instead of actual
// chars. Alt+V toggles visibility of the actual text.
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, styleToCellAttrs, truncate, caps } from '@termuijs/core';

export interface PasswordInputOptions {
    placeholder?: string;
    maxLength?: number;
    onChange?: (value: string) => void;
    onSubmit?: (value: string) => void;
}

export class PasswordInput extends Widget {
    private _value = '';
    private _cursorPos = 0;
    private _placeholder: string;
    private _maxLength: number;
    private _showText = false;
    private _onChange?: (value: string) => void;
    private _onSubmit?: (value: string) => void;
    focusable = true;

    // '●' in unicode terminals, '*' in ASCII fallback
    private get _maskChar(): string {
        return caps.unicode ? '●' : '*';
    }

    constructor(
        style: Partial<Style> = {},
        options: PasswordInputOptions = {},
    ) {
        super({ border: 'single', height: 3, ...style });
        this._placeholder = options.placeholder ?? '';
        this._maxLength = options.maxLength ?? Infinity;
        this._onChange = options.onChange;
        this._onSubmit = options.onSubmit;
    }

    /** The actual (unmasked) value. */
    get value(): string { return this._value; }

    set value(v: string) {
        this._value = v.slice(0, this._maxLength);
        this._cursorPos = Math.min(this._cursorPos, this._value.length);
    }

    /** Whether the text is currently visible (unmaksed). */
    get showText(): boolean { return this._showText; }

    /** Toggle visibility of the actual text (Alt+V). */
    toggleVisibility(): void {
        this._showText = !this._showText;
        this.markDirty();
    }

    insertChar(char: string): void {
        if (this._value.length >= this._maxLength) return;
        this._value =
            this._value.slice(0, this._cursorPos) +
            char +
            this._value.slice(this._cursorPos);
        this._cursorPos++;
        this._onChange?.(this._value);
        this.markDirty();
    }

    deleteBack(): void {
        if (this._cursorPos > 0) {
            this._value =
                this._value.slice(0, this._cursorPos - 1) +
                this._value.slice(this._cursorPos);
            this._cursorPos--;
            this._onChange?.(this._value);
            this.markDirty();
        }
    }

    deleteForward(): void {
        if (this._cursorPos < this._value.length) {
            this._value =
                this._value.slice(0, this._cursorPos) +
                this._value.slice(this._cursorPos + 1);
            this._onChange?.(this._value);
            this.markDirty();
        }
    }

    moveCursorLeft(): void { this._cursorPos = Math.max(0, this._cursorPos - 1); this.markDirty(); }
    moveCursorRight(): void { this._cursorPos = Math.min(this._value.length, this._cursorPos + 1); this.markDirty(); }
    moveCursorHome(): void { this._cursorPos = 0; this.markDirty(); }
    moveCursorEnd(): void { this._cursorPos = this._value.length; this.markDirty(); }
    submit(): void { this._onSubmit?.(this._value); }
    clear(): void { this._value = ''; this._cursorPos = 0; this._onChange?.(''); this.markDirty(); }

    /**
     * Handle key events. Call this from your input loop.
     *  Alt+V  — toggle visibility
     *  Other  — standard text editing
     */
    handleKey(event: KeyEvent): void {
        if (event.alt && event.key === 'v') {
            this.toggleVisibility();
            return;
        }
        switch (event.key) {
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

        if (this._value.length === 0 && !this.isFocused) {
            screen.writeString(x, y, truncate(this._placeholder, width), { ...attrs, dim: true });
            return;
        }

        // Show actual text when toggled, masked chars otherwise
        const displayValue = this._showText
            ? this._value
            : this._maskChar.repeat(this._value.length);

        const visibleWidth = width - 1;
        let scrollX = 0;
        if (this._cursorPos > visibleWidth) {
            scrollX = this._cursorPos - visibleWidth;
        }

        const visibleText = displayValue.slice(scrollX, scrollX + visibleWidth);
        screen.writeString(x, y, visibleText, attrs);

        if (this.isFocused) {
            const cursorScreenPos = x + this._cursorPos - scrollX;
            if (cursorScreenPos >= x && cursorScreenPos < x + width) {
                const cursorChar = this._cursorPos < displayValue.length
                    ? displayValue[this._cursorPos]
                    : ' ';
                screen.setCell(cursorScreenPos, y, {
                    char: cursorChar,
                    ...attrs,
                    inverse: true,
                });
            }
        }

        // Show a small indicator when text is visible
        if (this._showText && width > 4) {
            const indicator = caps.unicode ? ' 👁' : '[v]';
            screen.writeString(x + width - indicator.length, y, indicator, { ...attrs, dim: true });
        }
    }
}
