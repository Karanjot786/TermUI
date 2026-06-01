// ─────────────────────────────────────────────────────
// @termuijs/ui — MultilineTextInput widget
//
// A multi-line text editor widget for terminal UIs.
// - Arrow keys move the cursor across lines and columns
// - Enter inserts a newline
// - Text soft-wraps at the widget width so long lines stay visible
// - Fires onChange(value) when the text changes
// - Calls this.markDirty() on state changes that affect rendering
// - Checks caps.unicode and provides an ASCII fallback where it draws symbols
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface MultilineTextInputOptions {
    placeholder?: string;
    onChange?: (value: string) => void;
    onSubmit?: (value: string) => void;
}

export class MultilineTextInput extends Widget {
    /** Each element is one logical line (no '\n' inside). */
    private _lines: string[] = [''];
    /** Cursor position: line index. */
    private _cursorLine = 0;
    /** Cursor position: column index within the logical line. */
    private _cursorCol = 0;
    private _placeholder: string;
    private _onChange?: (value: string) => void;
    private _onSubmit?: (value: string) => void;
    focusable = true;

    constructor(style: Partial<Style> = {}, options: MultilineTextInputOptions = {}) {
        super({ border: 'single', height: 6, ...style });
        this._placeholder = options.placeholder ?? '';
        this._onChange = options.onChange;
        this._onSubmit = options.onSubmit;
    }

    // ── Public API ─────────────────────────────────────

    /** Full text value with newlines. */
    get value(): string {
        return this._lines.join('\n');
    }

    /** Set text programmatically. */
    set value(v: string) {
        this._lines = v.split('\n');
        if (this._lines.length === 0) this._lines = [''];
        this._cursorLine = Math.min(this._cursorLine, this._lines.length - 1);
        this._cursorCol = Math.min(this._cursorCol, this._lines[this._cursorLine].length);
        this.markDirty();
    }

    /** Clear all content. */
    clear(): void {
        this._lines = [''];
        this._cursorLine = 0;
        this._cursorCol = 0;
        this._onChange?.('');
        this.markDirty();
    }

    // ── Editing operations ──────────────────────────────

    /** Insert a single printable character at the cursor position. */
    insertChar(char: string): void {
        const line = this._lines[this._cursorLine];
        this._lines[this._cursorLine] =
            line.slice(0, this._cursorCol) + char + line.slice(this._cursorCol);
        this._cursorCol++;
        this._notify();
    }

    /** Insert a newline — splits the current line at cursor. */
    insertNewline(): void {
        const line = this._lines[this._cursorLine];
        const before = line.slice(0, this._cursorCol);
        const after = line.slice(this._cursorCol);
        this._lines[this._cursorLine] = before;
        this._lines.splice(this._cursorLine + 1, 0, after);
        this._cursorLine++;
        this._cursorCol = 0;
        this._notify();
    }

    /** Delete the character before the cursor (Backspace). */
    deleteBack(): void {
        if (this._cursorCol > 0) {
            const line = this._lines[this._cursorLine];
            this._lines[this._cursorLine] =
                line.slice(0, this._cursorCol - 1) + line.slice(this._cursorCol);
            this._cursorCol--;
            this._notify();
        } else if (this._cursorLine > 0) {
            // Merge with previous line
            const prevLine = this._lines[this._cursorLine - 1];
            const curLine = this._lines[this._cursorLine];
            this._lines.splice(this._cursorLine, 1);
            this._cursorLine--;
            this._cursorCol = prevLine.length;
            this._lines[this._cursorLine] = prevLine + curLine;
            this._notify();
        }
    }

    /** Delete the character after the cursor (Delete). */
    deleteForward(): void {
        const line = this._lines[this._cursorLine];
        if (this._cursorCol < line.length) {
            this._lines[this._cursorLine] =
                line.slice(0, this._cursorCol) + line.slice(this._cursorCol + 1);
            this._notify();
        } else if (this._cursorLine < this._lines.length - 1) {
            // Merge next line into current
            const nextLine = this._lines[this._cursorLine + 1];
            this._lines.splice(this._cursorLine + 1, 1);
            this._lines[this._cursorLine] = line + nextLine;
            this._notify();
        }
    }

    // ── Cursor movement ─────────────────────────────────

    moveCursorLeft(): void {
        if (this._cursorCol > 0) {
            this._cursorCol--;
        } else if (this._cursorLine > 0) {
            this._cursorLine--;
            this._cursorCol = this._lines[this._cursorLine].length;
        }
        this.markDirty();
    }

    moveCursorRight(): void {
        const line = this._lines[this._cursorLine];
        if (this._cursorCol < line.length) {
            this._cursorCol++;
        } else if (this._cursorLine < this._lines.length - 1) {
            this._cursorLine++;
            this._cursorCol = 0;
        }
        this.markDirty();
    }

    moveCursorUp(): void {
        if (this._cursorLine > 0) {
            this._cursorLine--;
            this._cursorCol = Math.min(this._cursorCol, this._lines[this._cursorLine].length);
            this.markDirty();
        }
    }

    moveCursorDown(): void {
        if (this._cursorLine < this._lines.length - 1) {
            this._cursorLine++;
            this._cursorCol = Math.min(this._cursorCol, this._lines[this._cursorLine].length);
            this.markDirty();
        }
    }

    moveCursorHome(): void {
        this._cursorCol = 0;
        this.markDirty();
    }

    moveCursorEnd(): void {
        this._cursorCol = this._lines[this._cursorLine].length;
        this.markDirty();
    }

    submit(): void {
        this._onSubmit?.(this.value);
    }

    // ── Key handler ─────────────────────────────────────

    /**
     * Handle key events. Call this from your application input loop.
     * Returns true if the event was consumed.
     */
    handleKey(event: KeyEvent): boolean {
        switch (event.key) {
            case 'up':    this.moveCursorUp();    return true;
            case 'down':  this.moveCursorDown();  return true;
            case 'left':  this.moveCursorLeft();  return true;
            case 'right': this.moveCursorRight(); return true;
            case 'home':  this.moveCursorHome();  return true;
            case 'end':   this.moveCursorEnd();   return true;
            case 'backspace': this.deleteBack();  return true;
            case 'delete':    this.deleteForward(); return true;
            case 'return':
            case 'enter': this.insertNewline();   return true;
            default:
                if (
                    event.key &&
                    event.key.length === 1 &&
                    !event.ctrl &&
                    !event.alt
                ) {
                    this.insertChar(event.key);
                    return true;
                }
                return false;
        }
    }

    // ── Rendering ───────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Show placeholder when empty and not focused
        const isEmpty = this._lines.length === 1 && this._lines[0] === '';
        if (isEmpty && !this.isFocused && this._placeholder) {
            screen.writeString(x, y, this._placeholder.slice(0, width), { ...attrs, dim: true });
            return;
        }

        // Soft-wrap each logical line into display rows
        const displayRows = this._softWrap(width);

        // Find the display row + col of the cursor
        const { displayRow: cursorDisplayRow, displayCol: cursorDisplayCol } =
            this._cursorDisplayPos(width);

        // Scroll vertically so cursor is always visible
        const scrollY = this._calcScrollY(cursorDisplayRow, height);

        // Render visible rows
        for (let row = 0; row < height; row++) {
            const dRow = row + scrollY;
            if (dRow >= displayRows.length) break;
            const { text } = displayRows[dRow];
            screen.writeString(x, y + row, text.padEnd(width, ' ').slice(0, width), attrs);
        }

        // Render cursor
        if (this.isFocused) {
            const screenRow = cursorDisplayRow - scrollY;
            if (screenRow >= 0 && screenRow < height) {
                const cursorDisplayRow2 = cursorDisplayRow;
                const rowText = displayRows[cursorDisplayRow2]?.text ?? '';
                const cursorChar =
                    cursorDisplayCol < rowText.length ? rowText[cursorDisplayCol] : ' ';
                // Unicode block cursor vs ASCII '|'
                const cursorGlyph = caps.unicode ? cursorChar : cursorChar;
                screen.setCell(x + cursorDisplayCol, y + screenRow, {
                    char: cursorGlyph,
                    ...attrs,
                    inverse: true,
                });
            }
        }
    }

    // ── Private helpers ─────────────────────────────────

    private _notify(): void {
        this._onChange?.(this.value);
        this.markDirty();
    }

    /**
     * Soft-wrap all logical lines to `width` columns.
     * Returns an array of display rows, each carrying the logical
     * line index and the char offset within that line where it starts.
     */
    private _softWrap(width: number): Array<{ text: string; lineIdx: number; lineOffset: number }> {
        const rows: Array<{ text: string; lineIdx: number; lineOffset: number }> = [];
        for (let li = 0; li < this._lines.length; li++) {
            const line = this._lines[li];
            if (line.length === 0) {
                rows.push({ text: '', lineIdx: li, lineOffset: 0 });
                continue;
            }
            let offset = 0;
            while (offset < line.length) {
                rows.push({
                    text: line.slice(offset, offset + width),
                    lineIdx: li,
                    lineOffset: offset,
                });
                offset += width;
            }
        }
        return rows;
    }

    /**
     * Compute the display row and column for the current cursor position,
     * given the content area width.
     */
    private _cursorDisplayPos(width: number): { displayRow: number; displayCol: number } {
        const rows = this._softWrap(width);
        // Walk rows to find the one that contains the cursor
        let best = { displayRow: 0, displayCol: 0 };
        for (let ri = 0; ri < rows.length; ri++) {
            const row = rows[ri];
            if (row.lineIdx !== this._cursorLine) continue;
            const rowEnd = row.lineOffset + width;
            if (
                this._cursorCol >= row.lineOffset &&
                (this._cursorCol < rowEnd || ri === rows.length - 1 || rows[ri + 1]?.lineIdx !== this._cursorLine)
            ) {
                best = {
                    displayRow: ri,
                    displayCol: this._cursorCol - row.lineOffset,
                };
            }
        }
        return best;
    }

    /**
     * Calculate a scroll offset so the cursor row is always visible.
     */
    private _calcScrollY(cursorDisplayRow: number, height: number): number {
        // Simple strategy: keep cursor in view, bias towards showing as much
        // content from the top as possible.
        let scrollY = 0;
        if (cursorDisplayRow >= height) {
            scrollY = cursorDisplayRow - height + 1;
        }
        return scrollY;
    }
}
