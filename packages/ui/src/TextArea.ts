import { type Screen, type Style, type KeyEvent, styleToCellAttrs, caps, truncate, mergeStyles, defaultStyle } from '@termuijs/core';
import { Widget } from '@termuijs/widgets';

export interface TextAreaOptions {
    /** Number of visible rows (default: 4) */
    rows?: number;
    placeholder?: string;
    onChange?: (value: string) => void;
    onSubmit?: (value: string) => void;
}

/**
 * TextArea - a multi-line text input field.
 *
 * Supports:
 * - Multi-line editing (Enter for newline)
 * - Cursor movement (up/down/left/right)
 * - Ctrl+Enter to submit
 * - Horizontal/Vertical scrolling when content overflows
 */
export class TextArea extends Widget {
    private _lines: string[] = [''];
    private _cursor = { row: 0, col: 0 };
    private _placeholder: string;
    private _onChange?: (value: string) => void;
    private _onSubmit?: (value: string) => void;

    constructor(style: Partial<Style> = {}, options: TextAreaOptions = {}) {
        // default rows = 4, add 2 for top/bottom single borders
        super(mergeStyles(defaultStyle(), { border: 'single', height: (options.rows ?? 4) + 2, ...style }));
        this._placeholder = options.placeholder ?? '';
        this._onChange = options.onChange;
        this._onSubmit = options.onSubmit;
        this.focusable = true;
    }

    get value(): string {
        return this._lines.join('\n');
    }

    set value(v: string) {
        this._lines = v.split('\n');
        if (this._lines.length === 0) this._lines = [''];
        this._cursor.row = Math.min(this._cursor.row, this._lines.length - 1);
        this._cursor.col = Math.min(this._cursor.col, this._lines[this._cursor.row].length);
        this.markDirty();
    }

    insertChar(char: string): void {
        const line = this._lines[this._cursor.row];
        this._lines[this._cursor.row] = line.slice(0, this._cursor.col) + char + line.slice(this._cursor.col);
        this._cursor.col++;
        this._notify();
    }

    insertNewline(): void {
        const line = this._lines[this._cursor.row];
        const before = line.slice(0, this._cursor.col);
        const after = line.slice(this._cursor.col);
        this._lines[this._cursor.row] = before;
        this._lines.splice(this._cursor.row + 1, 0, after);
        this._cursor.row++;
        this._cursor.col = 0;
        this._notify();
    }

    deleteBack(): void {
        if (this._cursor.col > 0) {
            const line = this._lines[this._cursor.row];
            this._lines[this._cursor.row] = line.slice(0, this._cursor.col - 1) + line.slice(this._cursor.col);
            this._cursor.col--;
            this._notify();
        } else if (this._cursor.row > 0) {
            const prevLine = this._lines[this._cursor.row - 1];
            const curLine = this._lines[this._cursor.row];
            this._lines.splice(this._cursor.row, 1);
            this._cursor.row--;
            this._cursor.col = prevLine.length;
            this._lines[this._cursor.row] = prevLine + curLine;
            this._notify();
        }
    }

    moveCursorLeft(): void {
        if (this._cursor.col > 0) {
            this._cursor.col--;
            this.markDirty();
        } else if (this._cursor.row > 0) {
            this._cursor.row--;
            this._cursor.col = this._lines[this._cursor.row].length;
            this.markDirty();
        }
    }

    moveCursorRight(): void {
        const line = this._lines[this._cursor.row];
        if (this._cursor.col < line.length) {
            this._cursor.col++;
            this.markDirty();
        } else if (this._cursor.row < this._lines.length - 1) {
            this._cursor.row++;
            this._cursor.col = 0;
            this.markDirty();
        }
    }

    moveCursorUp(): void {
        if (this._cursor.row > 0) {
            this._cursor.row--;
            this._cursor.col = Math.min(this._cursor.col, this._lines[this._cursor.row].length);
            this.markDirty();
        }
    }

    moveCursorDown(): void {
        if (this._cursor.row < this._lines.length - 1) {
            this._cursor.row++;
            this._cursor.col = Math.min(this._cursor.col, this._lines[this._cursor.row].length);
            this.markDirty();
        }
    }

    handleKey(event: KeyEvent): void {
        this.markDirty();
        const isEnter = event.key === 'enter' || event.key === 'return' || event.key === '\r' || event.key === '\n';
        
        if (isEnter && (event.ctrl || event.alt)) {
            this._onSubmit?.(this.value);
            return;
        }
        if (event.key === 's' && (event.ctrl || event.alt)) {
            this._onSubmit?.(this.value);
            return;
        }
        if (isEnter) {
            this.insertNewline();
            return;
        }

        switch (event.key) {
            case 'up':    this.moveCursorUp();    break;
            case 'down':  this.moveCursorDown();  break;
            case 'left':  this.moveCursorLeft();  break;
            case 'right': this.moveCursorRight(); break;
            case 'backspace': this.deleteBack();  break;
            case 'space': this.insertChar(' ');   break;
            default:
                if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
                    this.insertChar(event.key);
                }
                break;
        }
    }

    private _notify(): void {
        this._onChange?.(this.value);
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const isEmpty = this._lines.length === 1 && this._lines[0] === '';
        if (isEmpty && !this.isFocused && this._placeholder) {
            screen.writeString(x, y, truncate(this._placeholder, width), { ...attrs, dim: true });
            return;
        }

        // Scroll Y to keep cursor visible
        let scrollY = 0;
        if (this._cursor.row >= height) {
            scrollY = this._cursor.row - height + 1;
        }

        // Scroll X to keep cursor visible
        let scrollX = 0;
        if (this._cursor.col >= width) {
            scrollX = this._cursor.col - width + 1;
        }

        // Render visible lines
        for (let r = 0; r < height; r++) {
            const lineIdx = r + scrollY;
            if (lineIdx >= this._lines.length) break;
            const lineStr = this._lines[lineIdx];
            const visibleText = lineStr.slice(scrollX, scrollX + width).padEnd(width, ' ').slice(0, width);
            screen.writeString(x, y + r, visibleText, attrs);
        }

        // Draw cursor
        if (this.isFocused) {
            const screenRow = this._cursor.row - scrollY;
            const screenCol = this._cursor.col - scrollX;
            if (screenRow >= 0 && screenRow < height && screenCol >= 0 && screenCol < width) {
                const lineStr = this._lines[this._cursor.row] || '';
                const cursorChar = this._cursor.col < lineStr.length ? lineStr[this._cursor.col] : ' ';
                const asciiFallback = cursorChar === ' ' ? '_' : cursorChar;
                const cursorGlyph = caps.unicode ? cursorChar : asciiFallback;
                screen.setCell(x + screenCol, y + screenRow, {
                    char: cursorGlyph,
                    ...attrs,
                    inverse: true,
                });
            }
        }
    }
}
