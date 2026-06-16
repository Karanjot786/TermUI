import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, styleToCellAttrs, truncate, caps, splitGraphemes, stringWidth } from '@termuijs/core';
import { type VimMode } from './vim_modes.js';

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
    private _vimMode: VimMode = process.env.TERMUI_KEYBINDINGS === 'vim' ? 'normal' : 'insert';
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

        this.events.on('key', (event: KeyEvent) => this.handleKey(event));
    }

    /** The actual (unmasked) value. */
    get value(): string { return this._value; }

    set value(v: string) {
        const graphemes = splitGraphemes(v);
        if (graphemes.length > this._maxLength) {
            this._value = graphemes.slice(0, this._maxLength).join('');
        } else {
            this._value = v;
        }
        this._cursorPos = Math.min(this._cursorPos, splitGraphemes(this._value).length);
        this.markDirty();
    }

    get vimMode(): VimMode {
        return this._vimMode;
    }

    set vimMode(mode: VimMode) {
        this._vimMode = mode;
        this.markDirty();
    }

    /** Whether the text is currently visible (unmaksed). */
    get showText(): boolean { return this._showText; }

    /** Toggle visibility of the actual text (Alt+V). */
    toggleVisibility(): void {
        this._showText = !this._showText;
        this.markDirty();
    }

    insertChar(char: string): void {
        const graphemes = splitGraphemes(this._value);
        if (graphemes.length >= this._maxLength) return;
        graphemes.splice(this._cursorPos, 0, char);
        this._value = graphemes.join('');
        this._cursorPos++;
        this._onChange?.(this._value);
        this.markDirty();
    }

    deleteBack(): void {
        if (this._cursorPos > 0) {
            const graphemes = splitGraphemes(this._value);
            graphemes.splice(this._cursorPos - 1, 1);
            this._value = graphemes.join('');
            this._cursorPos--;
            this._onChange?.(this._value);
            this.markDirty();
        }
    }

    deleteForward(): void {
        const graphemes = splitGraphemes(this._value);
        if (this._cursorPos < graphemes.length) {
            graphemes.splice(this._cursorPos, 1);
            this._value = graphemes.join('');
            this._onChange?.(this._value);
            this.markDirty();
        }
    }

    moveCursorLeft(): void { this._cursorPos = Math.max(0, this._cursorPos - 1); this.markDirty(); }
    moveCursorRight(): void {
        const graphemes = splitGraphemes(this._value);
        this._cursorPos = Math.min(graphemes.length, this._cursorPos + 1);
        this.markDirty();
    }
    moveCursorHome(): void { this._cursorPos = 0; this.markDirty(); }
    moveCursorEnd(): void {
        const graphemes = splitGraphemes(this._value);
        this._cursorPos = graphemes.length;
        this.markDirty();
    }
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
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const isVim = process.env.TERMUI_KEYBINDINGS === 'vim';

        if (isVim) {
            if (this._vimMode === 'normal') {
                switch (event.key) {
                    case 'i':
                        this._vimMode = 'insert';
                        this.markDirty();
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                    case 'a':
                        this._vimMode = 'insert';
                        this.moveCursorRight();
                        this.markDirty();
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                    case 'v':
                        this._vimMode = 'visual';
                        this.markDirty();
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                    case 'h':
                        this.moveCursorLeft();
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                    case 'l':
                        this.moveCursorRight();
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                    case 'x': {
                        const graphemes = splitGraphemes(this._value);
                        if (this._cursorPos < graphemes.length) {
                            graphemes.splice(this._cursorPos, 1);
                            this._value = graphemes.join('');
                            this._cursorPos = Math.min(this._cursorPos, graphemes.length - 1);
                            this._cursorPos = Math.max(0, this._cursorPos);
                            this._onChange?.(this._value);
                            this.markDirty();
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                    }
                    case 'j':
                        event.key = 'tab';
                        event.shift = false;
                        break;
                    case 'k':
                        event.key = 'tab';
                        event.shift = true;
                        break;
                    case 'enter':
                    case 'return':
                        this.submit();
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                    default:
                        event.preventDefault();
                        event.stopPropagation();
                        break;
                }
                return;
            } else if (this._vimMode === 'visual') {
                if (event.key === 'escape') {
                    this._vimMode = 'normal';
                    this.markDirty();
                    event.preventDefault();
                    event.stopPropagation();
                } else {
                    event.preventDefault();
                    event.stopPropagation();
                }
                return;
            } else if (this._vimMode === 'insert') {
                if (event.key === 'escape') {
                    this._vimMode = 'normal';
                    this.moveCursorLeft();
                    this.markDirty();
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
            }
        }

        switch (event.key) {
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
            case 'return':
            case 'enter':
                this.submit();
                event.preventDefault();
                event.stopPropagation();
                break;
            default:
                if (event.key && splitGraphemes(event.key).length === 1 && !event.ctrl && !event.alt) {
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

        if (this._value.length === 0 && !this.isFocused) {
            screen.writeString(x, y, truncate(this._placeholder, width), { ...attrs, dim: true });
            return;
        }

        const graphemes = splitGraphemes(this._value);
        const displayGraphemes = this._showText
            ? graphemes
            : Array(graphemes.length).fill(this._maskChar);

        let rightReserved = 0;
        let modeIndicator = '';
        let showTextIndicator = '';
        if (process.env.TERMUI_KEYBINDINGS === 'vim' && this.isFocused && width > 15) {
            modeIndicator = ` -- ${this._vimMode.toUpperCase()} -- `;
            rightReserved = modeIndicator.length;
        } else if (this._showText && width > 4) {
            showTextIndicator = caps.unicode ? ' 👁' : '[v]';
            rightReserved = showTextIndicator.length;
        }

        const maxVisibleWidth = width - rightReserved;
        if (maxVisibleWidth <= 0) return;

        // Calculate visual width prefix sums
        const prefixWidths: number[] = [0];
        for (let i = 0; i < displayGraphemes.length; i++) {
            prefixWidths.push(prefixWidths[i] + stringWidth(displayGraphemes[i]));
        }

        let scrollGraphemeIndex = 0;
        const targetVisualEnd = this._cursorPos < displayGraphemes.length
            ? prefixWidths[this._cursorPos + 1]
            : prefixWidths[this._cursorPos];

        while (scrollGraphemeIndex < this._cursorPos && targetVisualEnd - prefixWidths[scrollGraphemeIndex] > maxVisibleWidth) {
            scrollGraphemeIndex++;
        }

        let endGraphemeIndex = scrollGraphemeIndex;
        while (endGraphemeIndex < displayGraphemes.length && prefixWidths[endGraphemeIndex + 1] - prefixWidths[scrollGraphemeIndex] <= maxVisibleWidth) {
            endGraphemeIndex++;
        }

        const visibleGraphemes = displayGraphemes.slice(scrollGraphemeIndex, endGraphemeIndex);
        const visibleText = visibleGraphemes.join('');
        screen.writeString(x, y, visibleText, attrs);

        if (this.isFocused) {
            const cursorOffset = prefixWidths[this._cursorPos] - prefixWidths[scrollGraphemeIndex];
            const cursorScreenPos = x + cursorOffset;
            if (cursorScreenPos >= x && cursorScreenPos < x + maxVisibleWidth) {
                const cursorChar = this._cursorPos < displayGraphemes.length
                    ? displayGraphemes[this._cursorPos]
                    : ' ';
                const isBlock = this._vimMode === 'normal' || this._vimMode === 'visual';
                screen.setCell(cursorScreenPos, y, {
                    char: cursorChar[0] || ' ',
                    ...attrs,
                    inverse: isBlock,
                    underline: !isBlock,
                });
            }
        }

        if (modeIndicator) {
            screen.writeString(x + width - modeIndicator.length, y, modeIndicator, { ...attrs, dim: true });
        } else if (showTextIndicator) {
            screen.writeString(x + width - showTextIndicator.length, y, showTextIndicator, { ...attrs, dim: true });
        }
    }
}

