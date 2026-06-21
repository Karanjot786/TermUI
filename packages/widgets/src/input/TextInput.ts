// ─────────────────────────────────────────────────────
// @termuijs/widgets — TextInput widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    styleToCellAttrs,
    truncate,
    type KeyEvent,
    splitGraphemes
} from '@termuijs/core';

import { Widget } from '../base/Widget.js';
import { type VimMode } from './vim.js';

export type { VimMode };

/**
 * TextInput — a single-line text input field
 * with optional command auto-completion support.
 */
export class TextInput extends Widget {
    private _value = '';
    private _cursorPos = 0;

    private _placeholder: string;
    private _mask: string | null;
    private _maxLength: number;

    private _onChange?: (value: string) => void;
    private _onSubmit?: (value: string) => void;

    // Auto-complete
    private _suggestions: string[] = [];
    private _suggestionIndex = 0;

    // Vim mode support
    private _vimMode: VimMode =
        process.env.TERMUI_KEYBINDINGS === 'vim'
            ? 'normal'
            : 'insert';

    constructor(
        style: Partial<Style> = {},
        options: {
            placeholder?: string;
            mask?: string;
            maxLength?: number;
            suggestions?: string[];
            onChange?: (value: string) => void;
            onSubmit?: (value: string) => void;
        } = {},
    ) {
        super({
            border: 'single',
            height: 3,
            ...style,
        });

        this._placeholder = options.placeholder ?? '';
        this._mask = options.mask ?? null;
        this._maxLength = options.maxLength ?? Infinity;

        this._onChange = options.onChange;
        this._onSubmit = options.onSubmit;

        // Auto-complete data
        this._suggestions = options.suggestions ?? [];

        this.focusable = true;

        this.events.on('key', (event: KeyEvent) =>
            this.handleKey(event)
        );
    }

        // ── Getters & Setters ─────────────────────────────

    get value(): string {
        return this._value;
    }

    set value(v: string) {
        const graphemes = splitGraphemes(v);

        if (graphemes.length > this._maxLength) {
            this._value = graphemes
                .slice(0, this._maxLength)
                .join('');
        } else {
            this._value = v;
        }

        this._cursorPos = Math.min(
            this._cursorPos,
            splitGraphemes(this._value).length
        );

        this.markDirty();
    }

    get vimMode(): VimMode {
        return this._vimMode;
    }

    set vimMode(mode: VimMode) {
        this._vimMode = mode;
        this.markDirty();
    }


    // ── Text Editing ──────────────────────────────────

    insertChar(char: string): void {
        const graphemes = splitGraphemes(this._value);

        if (graphemes.length >= this._maxLength) {
            return;
        }

        graphemes.splice(this._cursorPos, 0, char);

        this._value = graphemes.join('');
        this._cursorPos++;

        this._onChange?.(this._value);

        // reset autocomplete selection
        this._suggestionIndex = 0;

        this.markDirty();
    }


    deleteBack(): void {
        if (this._cursorPos <= 0) {
            return;
        }

        const graphemes = splitGraphemes(this._value);

        graphemes.splice(this._cursorPos - 1, 1);

        this._value = graphemes.join('');
        this._cursorPos--;

        this._onChange?.(this._value);
        this.markDirty();
    }


    deleteForward(): void {
        const graphemes = splitGraphemes(this._value);

        if (this._cursorPos >= graphemes.length) {
            return;
        }

        graphemes.splice(this._cursorPos, 1);

        this._value = graphemes.join('');

        this._onChange?.(this._value);
        this.markDirty();
    }


    // ── Auto Complete ─────────────────────────────────

    getSuggestions(input: string): string[] {
        return this._suggestions.filter(item =>
            item
                .toLowerCase()
                .includes(input.toLowerCase())
        );
    }


    acceptSuggestion(): void {
        const suggestions = this.getSuggestions(this._value);

        if (suggestions.length === 0) {
            return;
        }

        this.value = suggestions[this._suggestionIndex];

        this._cursorPos = splitGraphemes(
            this._value
        ).length;

        this.markDirty();
    }

        // ── Cursor Movement ───────────────────────────────

    moveCursorLeft(): void {
        const next = Math.max(0, this._cursorPos - 1);

        if (next === this._cursorPos) {
            return;
        }

        this._cursorPos = next;
        this.markDirty();
    }


    moveCursorRight(): void {
        const graphemes = splitGraphemes(this._value);

        const next = Math.min(
            graphemes.length,
            this._cursorPos + 1
        );

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
        const graphemes = splitGraphemes(this._value);

        if (this._cursorPos === graphemes.length) {
            return;
        }

        this._cursorPos = graphemes.length;
        this.markDirty();
    }


    // ── Actions ───────────────────────────────────────

    submit(): void {
        this._onSubmit?.(this._value);
    }


    clear(): void {
        this._value = '';
        this._cursorPos = 0;

        this._suggestionIndex = 0;

        this._onChange?.('');

        this.markDirty();
    }

    clearLine(): void {
        this._value = '';
        this._cursorPos = 0;
        this._onChange?.('');
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        const isVim = process.env.TERMUI_KEYBINDINGS === 'vim';

        // Vim mode handling
        if (isVim) {
            if (this._vimMode === 'normal') {
                switch (event.key) {
                    case 'i':
                        this._vimMode = 'insert';
                        this.markDirty();
                        event.preventDefault();
                        event.stopPropagation();
                        return;

                    case 'a':
                        this._vimMode = 'insert';
                        this.moveCursorRight();
                        this.markDirty();
                        event.preventDefault();
                        event.stopPropagation();
                        return;

                    case 'h':
                        this.moveCursorLeft();
                        event.preventDefault();
                        event.stopPropagation();
                        return;

                    case 'l':
                        this.moveCursorRight();
                        event.preventDefault();
                        event.stopPropagation();
                        return;

                    case 'x':
                        this.deleteForward();
                        event.preventDefault();
                        event.stopPropagation();
                        return;

                    case 'enter':
                    case 'return':
                        this.submit();
                        event.preventDefault();
                        event.stopPropagation();
                        return;

                    default:
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                }
            }

            if (this._vimMode === 'insert' && event.key === 'escape') {
                this._vimMode = 'normal';
                this.moveCursorLeft();

                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }

        if (event.ctrl) {
            if (event.key === 'u') {
                this.clearLine();
                event.preventDefault();
                event.stopPropagation();
                return;
            } else if (event.key === 'w') {
                this.deleteWordBack();
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }

        switch (event.key) {
            case 'tab':
                this.acceptSuggestion();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'backspace':
                this.deleteBack();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'delete':
                this.deleteForward();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'left':
                this.moveCursorLeft();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'right':
                this.moveCursorRight();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'home':
                this.moveCursorHome();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'end':
                this.moveCursorEnd();
                event.preventDefault();
                event.stopPropagation();
                break;

            case 'enter':
            case 'return':
                this.submit();
                event.preventDefault();
                event.stopPropagation();
                break;

            default:
                if (
                    event.key &&
                    splitGraphemes(event.key).length === 1 &&
                    !event.ctrl &&
                    !event.alt
                ) {
                    this.insertChar(event.key);
                    event.preventDefault();
                    event.stopPropagation();
                }
        }
    }

        protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        let display = this._value;

        if (this._mask) {
            display = splitGraphemes(this._value)
                .map(() => this._mask!)
                .join('');
        }

        if (display.length === 0 && !this.isFocused) {
            display = this._placeholder;
        }

        const graphemes = splitGraphemes(display);

let scrollX = 0;

if (this.isFocused && graphemes.length > width) {
    scrollX = Math.max(0, this._cursorPos - width);
}

display = graphemes
    .slice(scrollX, scrollX + width)
    .join('');


        screen.writeString(
            x,
            y,
            display,
            {
                ...attrs,
                dim: this._value.length === 0,
            }
        );

        // Cursor
        if (this.isFocused) {
            if (this.isFocused) {
    const cursorIndex = this._cursorPos - scrollX;

    if (cursorIndex >= 0 && cursorIndex < width) {
        const charIndex = Math.min(
            this._cursorPos,
            graphemes.length - 1
        );

        screen.setCell(x + cursorIndex, y, {
            char: graphemes[charIndex] ?? ' ',
            ...attrs,
            underline: true,
        });
    }
}

// Cursor
if (this.isFocused) {
    const cursorIndex = this._cursorPos - scrollX;

    if (cursorIndex >= 0 && cursorIndex < width) {
        const charIndex = Math.min(
            this._cursorPos,
            graphemes.length - 1
        );

        screen.setCell(x + cursorIndex, y, {
            char: graphemes[charIndex] ?? ' ',
            ...attrs,
            underline: true,
        });
    }
}
        }

        // Auto-complete suggestions
        const suggestions = this.getSuggestions(this._value)
            .slice(0, height - 1);

        suggestions.forEach((suggestion, index) => {
            screen.writeString(
                x,
                y + index + 1,
                truncate(suggestion, width),
                {
                    ...attrs,
                    dim: true,
                }
            );
        });
    }
}