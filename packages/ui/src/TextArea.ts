import { type Screen, type Style, type KeyEvent, styleToCellAttrs, caps, truncate, mergeStyles, defaultStyle, splitGraphemes, stringWidth } from '@termuijs/core';
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
        this._cursor.col = Math.min(this._cursor.col, splitGraphemes(this._lines[this._cursor.row]).length);
        this.markDirty();
    }

    insertChar(char: string): void {
        const graphemes = splitGraphemes(this._lines[this._cursor.row]);
        graphemes.splice(this._cursor.col, 0, char);
        this._lines[this._cursor.row] = graphemes.join('');
        this._cursor.col++;
        this._notify();
    }

    insertNewline(): void {
        const graphemes = splitGraphemes(this._lines[this._cursor.row]);
        const before = graphemes.slice(0, this._cursor.col).join('');
        const after = graphemes.slice(this._cursor.col).join('');
        this._lines[this._cursor.row] = before;
        this._lines.splice(this._cursor.row + 1, 0, after);
        this._cursor.row++;
        this._cursor.col = 0;
        this._notify();
    }

    deleteBack(): void {
        if (this._cursor.col > 0) {
            const graphemes = splitGraphemes(this._lines[this._cursor.row]);
            graphemes.splice(this._cursor.col - 1, 1);
            this._lines[this._cursor.row] = graphemes.join('');
            this._cursor.col--;
            this._notify();
        } else if (this._cursor.row > 0) {
            const prevLine = this._lines[this._cursor.row - 1];
            const curLine = this._lines[this._cursor.row];
            this._lines.splice(this._cursor.row, 1);
            this._cursor.row--;
            this._cursor.col = splitGraphemes(prevLine).length;
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
            this._cursor.col = splitGraphemes(this._lines[this._cursor.row]).length;
            this.markDirty();
        }
    }

    moveCursorRight(): void {
        const lineLength = splitGraphemes(this._lines[this._cursor.row]).length;
        if (this._cursor.col < lineLength) {
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
            this._cursor.col = Math.min(this._cursor.col, splitGraphemes(this._lines[this._cursor.row]).length);
            this.markDirty();
        }
    }

    moveCursorDown(): void {
        if (this._cursor.row < this._lines.length - 1) {
            this._cursor.row++;
            this._cursor.col = Math.min(this._cursor.col, splitGraphemes(this._lines[this._cursor.row]).length);
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

        // Render visible lines
        for (let r = 0; r < height; r++) {
            const lineIdx = r + scrollY;
            if (lineIdx >= this._lines.length) break;
            const { visibleText } = this._visibleLine(this._lines[lineIdx], lineIdx === this._cursor.row ? this._cursor.col : 0, width);
            screen.writeString(x, y + r, visibleText, attrs);
        }

        // Draw cursor
        if (this.isFocused) {
            const screenRow = this._cursor.row - scrollY;
            const currentLine = this._lines[this._cursor.row] || '';
            const { scrollIndex } = this._visibleLine(currentLine, this._cursor.col, width);
            const screenCol = this._widthUntil(currentLine, scrollIndex, this._cursor.col);
            if (screenRow >= 0 && screenRow < height && screenCol >= 0 && screenCol < width) {
                const graphemes = splitGraphemes(currentLine);
                const cursorChar = this._cursor.col < graphemes.length ? graphemes[this._cursor.col] : ' ';
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

    private _visibleLine(line: string, cursorCol: number, width: number): { visibleText: string; scrollIndex: number } {
        const graphemes = splitGraphemes(line);
        let scrollIndex = 0;
        while (scrollIndex < cursorCol && this._widthUntil(line, scrollIndex, cursorCol) >= width) {
            scrollIndex++;
        }

        let endIndex = scrollIndex;
        let visibleWidth = 0;
        while (endIndex < graphemes.length) {
            const nextWidth = stringWidth(graphemes[endIndex]);
            if (visibleWidth + nextWidth > width) break;
            visibleWidth += nextWidth;
            endIndex++;
        }

        return {
            visibleText: graphemes.slice(scrollIndex, endIndex).join('').padEnd(Math.max(0, width - visibleWidth), ' '),
            scrollIndex,
        };
    }

    private _widthUntil(line: string, start: number, end: number): number {
        return splitGraphemes(line)
            .slice(start, end)
            .reduce((sum, grapheme) => sum + stringWidth(grapheme), 0);
    }
}
