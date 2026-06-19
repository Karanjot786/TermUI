// ─────────────────────────────────────────────────────
// @termuijs/widgets — TextInput widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    styleToCellAttrs,
    stringWidth,
    truncate,
    type KeyEvent
} from '@termuijs/core';

import { Widget } from '../base/Widget.js';

/**
 * TextInput — a single-line text input field.
 */
export class TextInput extends Widget {
    private _value = '';
    private _cursorPos = 0;
    private _placeholder: string;
    private _mask: string | null;
    private _maxLength: number;
    private _onChange?: (value: string) => void;
    private _onSubmit?: (value: string) => void;

    constructor(
        style: Partial<Style> = {},
        options: {
            placeholder?: string;
            mask?: string;
            maxLength?: number;
            onChange?: (value: string) => void;
            onSubmit?: (value: string) => void;
        } = {},
    ) {
        super({ border: 'single', height: 3, ...style });

        this._placeholder = options.placeholder ?? '';
        this._mask = options.mask ?? null;
        this._maxLength = options.maxLength ?? Infinity;
        this._onChange = options.onChange;
        this._onSubmit = options.onSubmit;

        this.focusable = true;
    }

    get value(): string {
        return this._value;
    }

    set value(v: string) {
        this._value = v.slice(0, this._maxLength);
        this._cursorPos = Math.min(this._cursorPos, this._value.length);
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
                this.moveCursorLeft();
                break;
            case 'right':
                this.moveCursorRight();
                break;
            case 'home':
                this.moveCursorHome();
                break;
            case 'end':
                this.moveCursorEnd();
                break;
            case 'backspace':
                this.deleteBack();
                break;
            case 'delete':
                this.deleteForward();
                break;
            case 'enter':
                this.submit();
                break;
            default:
                if (event.key.length === 1 && !event.ctrl && !event.alt) {
                    this.insertChar(event.key);
                }
        }
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

    moveCursorLeft(): void {
        const next = Math.max(0, this._cursorPos - 1);

        if (next === this._cursorPos) {
            return;
        }

        this._cursorPos = next;
        this.markDirty();
    }

    moveCursorRight(): void {
        const next = Math.min(this._value.length, this._cursorPos + 1);

        if (next === this._cursorPos) {
            return;
        }

        this._cursorPos = next;
        this.markDirty();
    }

    moveCursorHome(): void {
        if (this._cursorPos === 0) {
            return;
        }

        this._cursorPos = 0;
        this.markDirty();
    }

    moveCursorEnd(): void {
        if (this._cursorPos === this._value.length) {
            return;
        }

        this._cursorPos = this._value.length;
        this.markDirty();
    }

    submit(): void {
        this._onSubmit?.(this._value);
    }

    clear(): void {
        this._value = '';
        this._cursorPos = 0;
        this._onChange?.('');
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        if (this._value.length === 0 && !this.isFocused) {
            screen.writeString(
                x,
                y,
                truncate(this._placeholder, width),
                { ...attrs, dim: true }
            );
            return;
        }

        const displayValue = this._mask
            ? this._mask.repeat(this._value.length)
            : this._value;

        const visibleWidth = width - 1;

        let scrollX = 0;
        if (this._cursorPos > visibleWidth) {
            scrollX = this._cursorPos - visibleWidth;
        }

        const visibleText = displayValue.slice(
            scrollX,
            scrollX + visibleWidth
        );

        screen.writeString(x, y, visibleText, attrs);

        // Cursor
        if (this.isFocused) {
            const cursorScreenPos = x + this._cursorPos - scrollX;

            if (cursorScreenPos >= x && cursorScreenPos < x + width) {
                const cursorChar =
                    this._cursorPos < displayValue.length
                        ? displayValue[this._cursorPos]
                        : ' ';

                screen.setCell(cursorScreenPos, y, {
                    char: cursorChar,
                    ...attrs,
                    inverse: true,
                });
            }
        }

        // ─────────────────────────────────────
        // ✅ CHARACTER COUNTER (NEW FEATURE)
        // ─────────────────────────────────────
        if (this.isFocused) {
            const length = this._value.length;
            const max =
                this._maxLength === Infinity ? null : this._maxLength;

            const counterText = max
                ? `${length}/${max}`
                : `${length}`;

            const counterWidth = stringWidth(counterText);
            const counterX = x + width - counterWidth;

            if (counterX >= x) {
                screen.writeString(
                    counterX,
                    y,
                    counterText,
                    { ...attrs, dim: true }
                );
            }
        }
    }
}
