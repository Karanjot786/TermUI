// ─────────────────────────────────────────────────────
// @termuijs/ui — EmailInput widget
//
// A TextInput restricted to email addresses.
// - Validates email format
// - Shows inline error for invalid emails
// - Supports tab autocomplete for domains
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import { type Style, type Color, type Screen, type KeyEvent, styleToCellAttrs, truncate, mergeStyles, defaultStyle, splitGraphemes, stringWidth } from '@termuijs/core';

export interface EmailInputOptions {
    placeholder?: string;
    /** Common domains to suggest after '@'. Default: ['gmail.com','outlook.com','yahoo.com'] */
    domains?: string[];
    onSubmit?: (value: string) => void;
    onChange?: (value: string, valid: boolean) => void;
    errorColor?: Color;
}

export class EmailInput extends Widget {
    private _raw = '';
    private _cursorPos = 0;
    private _placeholder: string;
    private _domains: string[];
    private _onSubmit?: (value: string) => void;
    private _onChange?: (value: string, valid: boolean) => void;
    private _errorColor: Color;
    
    focusable = true;

    constructor(
        style: Partial<Style> = {},
        opts: EmailInputOptions = {},
    ) {
        super(mergeStyles(defaultStyle(), { border: 'single', height: 3, ...style }));
        this._placeholder = opts.placeholder ?? '';
        this._domains = opts.domains ?? ['gmail.com', 'outlook.com', 'yahoo.com'];
        this._onSubmit = opts.onSubmit;
        this._onChange = opts.onChange;
        this._errorColor = opts.errorColor ?? { type: 'named', name: 'red' };
    }

    getValue(): string {
        return this._raw;
    }

    isValid(): boolean {
        return /^[^@]+@[^@]+\.[^@]+$/.test(this._raw);
    }

    private _notify(): void {
        this._onChange?.(this._raw, this.isValid());
        this.markDirty();
    }

    insertChar(char: string): void {
        const graphemes = splitGraphemes(this._raw);
        const inserted = splitGraphemes(char);
        graphemes.splice(this._cursorPos, 0, ...inserted);
        this._raw = graphemes.join('');
        this._cursorPos += inserted.length;
        this._notify();
    }

    deleteBack(): void {
        if (this._cursorPos > 0) {
            const graphemes = splitGraphemes(this._raw);
            graphemes.splice(this._cursorPos - 1, 1);
            this._raw = graphemes.join('');
            this._cursorPos--;
            this._notify();
        }
    }

    deleteForward(): void {
        const graphemes = splitGraphemes(this._raw);
        if (this._cursorPos < graphemes.length) {
            graphemes.splice(this._cursorPos, 1);
            this._raw = graphemes.join('');
            this._notify();
        }
    }

    moveCursorLeft(): void { 
        this._cursorPos = Math.max(0, this._cursorPos - 1); 
        this.markDirty(); 
    }
    
    moveCursorRight(): void { 
        this._cursorPos = Math.min(splitGraphemes(this._raw).length, this._cursorPos + 1);
        this.markDirty(); 
    }
    
    moveCursorHome(): void { 
        this._cursorPos = 0; 
        this.markDirty(); 
    }
    
    moveCursorEnd(): void { 
        this._cursorPos = splitGraphemes(this._raw).length;
        this.markDirty(); 
    }

    autocompleteDomain(): void {
        const atIndex = this._raw.lastIndexOf('@');
        if (atIndex === -1) return;

        const typedDomain = this._raw.slice(atIndex + 1);
        const match = this._domains.find(d => d.startsWith(typedDomain));
        
        if (match) {
            this._raw = this._raw.slice(0, atIndex + 1) + match;
            this._cursorPos = splitGraphemes(this._raw).length;
            this._notify();
        }
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'backspace': this.deleteBack(); break;
            case 'delete': this.deleteForward(); break;
            case 'left': this.moveCursorLeft(); break;
            case 'right': this.moveCursorRight(); break;
            case 'home': this.moveCursorHome(); break;
            case 'end': this.moveCursorEnd(); break;
            case 'tab': this.autocompleteDomain(); break;
            case 'return':
            case 'enter':
                if (this.isValid()) {
                    this._onSubmit?.(this._raw);
                }
                break;
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

        const display = splitGraphemes(this._raw);
        const visibleWidth = width - 1;
        let scrollIndex = 0;
        while (stringWidth(display.slice(scrollIndex, this._cursorPos).join('')) > visibleWidth) {
            scrollIndex++;
        }

        const visibleText = truncate(display.slice(scrollIndex).join(''), visibleWidth, '');
        
        // Show error indicator if invalid and not empty
        const isError = this._raw.length > 0 && !this.isValid();
        const renderAttrs = isError ? { ...attrs, fg: this._errorColor } : attrs;

        screen.writeString(x, y, visibleText, renderAttrs);

        if (this.isFocused) {
            const cursorOffset = stringWidth(display.slice(scrollIndex, this._cursorPos).join(''));
            const cursorScreenPos = x + cursorOffset;
            if (cursorScreenPos >= x && cursorScreenPos < x + width) {
                const cursorChar = display[this._cursorPos] ?? ' ';
                screen.setCell(cursorScreenPos, y, {
                    char: cursorChar,
                    ...renderAttrs,
                    inverse: true,
                });
            }
        }
        
        // Inline error indicator if error
        if (isError && width > 4) {
            const hint = `[!]`;
            screen.writeString(x + width - hint.length, y, hint, { ...renderAttrs, fg: this._errorColor });
        }
    }
}
