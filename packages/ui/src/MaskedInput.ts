// ─────────────────────────────────────────────────────
// @termuijs/ui — MaskedInput widget
//
// Text input constrained to a mask template.
// '_' = editable slot. Other chars are fixed.
// Examples: date '__/__/____', phone '(___) ___-____'
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, type Color, styleToCellAttrs, truncate } from '@termuijs/core';

export interface MaskedInputOptions {
    /** Mask template. '_' = editable slot. Other chars are fixed. Example: '__/__/____' */
    mask: string;
    /** Character shown in empty slots. Default: '_' */
    placeholder?: string;
    /** Callback when all slots are filled */
    onComplete?: (value: string) => void;
    /** Callback on every change */
    onChange?: (value: string) => void;
    /** Color for the text */
    color?: Color;
}

export class MaskedInput extends Widget {
    private _mask: string;
    private _slots: (string | null)[] = []; // null = empty slot, string = filled
    private _cursorSlotIndex = 0; // index into _slots array
    private _placeholder: string;
    private _onComplete?: (value: string) => void;
    private _onChange?: (value: string) => void;
    private _color?: Color;
    focusable = true;

    constructor(
        style: Partial<Style> = {},
        options: MaskedInputOptions,
    ) {
        super({ border: 'single', height: 3, ...style });
        this._mask = options.mask;
        this._placeholder = options.placeholder ?? '_';
        this._onComplete = options.onComplete;
        this._onChange = options.onChange;
        this._color = options.color;

        // Initialize slots array with one entry per '_' in mask
        const slots: (string | null)[] = [];
        for (const char of this._mask) {
            if (char === '_') {
                slots.push(null);
            }
        }
        this._slots = slots;
    }

    /** Get the complete masked string with current values filled in. */
    getValue(): string {
        let result = '';
        let slotIndex = 0;

        for (const char of this._mask) {
            if (char === '_') {
                const val = this._slots[slotIndex];
                result += val ?? this._placeholder;
                slotIndex++;
            } else {
                result += char;
            }
        }

        return result;
    }

    /** Reset all slots to empty and position cursor at first slot. */
    reset(): void {
        this._slots = this._slots.map(() => null);
        this._cursorSlotIndex = 0;
        this._onChange?.(this.getValue());
        this.markDirty();
    }

    /** Check if all slots are filled. */
    private _isComplete(): boolean {
        return this._slots.every((slot) => slot !== null);
    }

    /** Move cursor to the next empty slot, skipping filled ones. Auto-advance on input. */
    private _advanceToNextEmpty(): void {
        while (this._cursorSlotIndex < this._slots.length && this._slots[this._cursorSlotIndex] !== null) {
            this._cursorSlotIndex++;
        }
    }

    /** Move cursor right to the next slot. */
    private _moveCursorRight(): void {
        if (this._cursorSlotIndex < this._slots.length - 1) {
            this._cursorSlotIndex++;
        }
    }

    /** Move cursor to the previous slot. */
    private _moveCursorLeft(): void {
        if (this._cursorSlotIndex > 0) {
            this._cursorSlotIndex--;
        }
    }

    /** Insert a character at the current slot. Auto-advance past filled chars. */
    private _insertChar(char: string): void {
        if (char.length !== 1) return;
        if (this._cursorSlotIndex >= this._slots.length) return; // Already at end

        this._slots[this._cursorSlotIndex] = char;
        this._advanceToNextEmpty();
        this._onChange?.(this.getValue());

        if (this._isComplete()) {
            this._onComplete?.(this.getValue());
        }

        this.markDirty();
    }

    /** Clear the previous slot and move cursor back. */
    private _deleteBack(): void {
        if (this._cursorSlotIndex > 0) {
            this._cursorSlotIndex--;
            this._slots[this._cursorSlotIndex] = null;
            this._onChange?.(this.getValue());
            this.markDirty();
        }
    }

    /**
     * Handle key events. Call this from your input loop.
     */
    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'backspace':
                this._deleteBack();
                break;

            case 'left':
                this._moveCursorLeft();
                this.markDirty();
                break;

            case 'right':
                this._moveCursorRight();
                this.markDirty();
                break;

            case 'home':
                this._cursorSlotIndex = 0;
                this.markDirty();
                break;

            case 'end':
                this._cursorSlotIndex = this._slots.length - 1;
                this.markDirty();
                break;

            default:
                // Single character input
                if (event.key?.length === 1) {
                    this._insertChar(event.key);
                }
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        if (this._color) {
            attrs.fg = this._color;
        }
        const value = this.getValue();
        const display = truncate(value, width);

        screen.writeString(x, y, display, attrs);

        // Render cursor at current slot position if focused
        if (this.isFocused) {
            const cursorX = x + this._getCursorDisplayPos();
            if (cursorX >= x && cursorX < x + width) {
                const cellIndex = cursorX - x;
                if (cellIndex >= 0 && cellIndex < display.length) {
                    const cell = screen.back[y]?.[cursorX];
                    if (cell) {
                        cell.inverse = true;
                    }
                }
            }
        }
    }

    /** Calculate the display position of the cursor (account for fixed chars before it). */
    private _getCursorDisplayPos(): number {
        let displayPos = 0;
        let slotCount = 0;

        for (const char of this._mask) {
            if (char === '_') {
                if (slotCount === this._cursorSlotIndex) {
                    return displayPos;
                }
                slotCount++;
            }
            displayPos++;
        }

        return displayPos;
    }
}
