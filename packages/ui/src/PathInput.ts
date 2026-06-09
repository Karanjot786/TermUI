// ─────────────────────────────────────────────────────
// @termuijs/ui — PathInput widget
//
// A TextInput with Tab-completion for filesystem paths.
// - Tab triggers completion: reads dir entries via readdirSync
// - Shows completion options below the input
// - Tab cycles through completions
// - Enter accepts current value
// - Handles relative and absolute paths gracefully
// ─────────────────────────────────────────────────────

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, styleToCellAttrs, truncate, caps } from '@termuijs/core';

export interface PathInputOptions {
    placeholder?: string;
    maxLength?: number;
    cwd?: string;               // base directory for relative paths
    maxCompletions?: number;    // max completions shown (default 5)
    onChange?: (value: string) => void;
    onSubmit?: (value: string) => void;
}

/**
 * PathInput — filesystem path input with Tab-completion.
 *
 * @note height must be at least (maxCompletions + 2) to show completions.
 * Default height of 3 shows up to 1 completion. If height is insufficient,
 * the input line is still rendered but completions are hidden.
 */
export class PathInput extends Widget {
    private _value = '';
    private _cursorPos = 0;
    private _placeholder: string;
    private _maxLength: number;
    private _cwd: string;
    private _maxCompletions: number;
    private _completions: string[] = [];
    private _completionIndex = -1;       // -1 = original value, 0..n = cycling
    private _preCompletionValue = '';    // value before Tab was pressed
    private _showCompletions = false;
    private _onChange?: (value: string) => void;
    private _onSubmit?: (value: string) => void;
    focusable = true;

    constructor(
        style: Partial<Style> = {},
        options: PathInputOptions = {},
    ) {
        super({ border: 'single', height: 3, ...style });
        this._placeholder = options.placeholder ?? '';
        this._maxLength = options.maxLength ?? 4096;
        this._cwd = options.cwd ?? process.cwd();
        this._maxCompletions = options.maxCompletions ?? 5;
        this._onChange = options.onChange;
        this._onSubmit = options.onSubmit;
    }

    get value(): string { return this._value; }

    set value(v: string) {
        this._value = v.slice(0, this._maxLength);
        this._cursorPos = Math.min(this._cursorPos, this._value.length);
        this._dismissCompletions();
    }

    get completions(): string[] { return this._completions; }
    get isShowingCompletions(): boolean { return this._showCompletions && this._completions.length > 0; }

    private _dismissCompletions(): void {
        this._completions = [];
        this._completionIndex = -1;
        this._showCompletions = false;
    }

    /** Compute completions for the current value. Does NOT throw. */
    private _computeCompletions(): string[] {
        try {
            const raw = this._value;
            const isAbs = path.isAbsolute(raw);
            const base = isAbs ? raw : path.join(this._cwd, raw);

            // Determine the directory to list and the prefix to filter by
            let dir: string;
            let prefix: string;

            // If raw ends with separator or is empty, list the dir itself
            if (raw === '' || raw.endsWith('/') || raw.endsWith(path.sep)) {
                dir = isAbs ? raw || '/' : path.join(this._cwd, raw || '.');
                prefix = '';
            } else {
                dir = path.dirname(base);
                prefix = path.basename(base).toLowerCase();
            }

            const entries = fs.readdirSync(dir, { withFileTypes: true });
            const matches = entries
                .filter((e) => e.name.toLowerCase().startsWith(prefix))
                .slice(0, this._maxCompletions)
                .map((e) => {
                    const full = path.join(dir, e.name);
                    // Return path relative to cwd or absolute depending on input style
                    const candidate = isAbs
                        ? full + (e.isDirectory() ? path.sep : '')
                        : path.relative(this._cwd, full) + (e.isDirectory() ? path.sep : '');
                    return candidate;
                });

            return matches;
        } catch {
            return [];
        }
    }

    /** Trigger tab-completion. */
    triggerCompletion(): void {
        if (!this._showCompletions || this._completions.length === 0) {
            // First Tab press — compute completions
            this._preCompletionValue = this._value;
            this._completions = this._computeCompletions();
            if (this._completions.length === 0) {
                this._showCompletions = false;
                return;
            }
            this._showCompletions = true;
            this._completionIndex = 0;
        } else {
            // Subsequent Tab presses — cycle
            this._completionIndex = (this._completionIndex + 1) % this._completions.length;
        }

        this._value = this._completions[this._completionIndex];
        this._cursorPos = this._value.length;
        this._onChange?.(this._value);
        this.markDirty();
    }

    insertChar(char: string): void {
        if (this._value.length >= this._maxLength) return;
        this._value =
            this._value.slice(0, this._cursorPos) +
            char +
            this._value.slice(this._cursorPos);
        this._cursorPos++;
        this._dismissCompletions();
        this._onChange?.(this._value);
        this.markDirty();
    }

    deleteBack(): void {
        if (this._cursorPos > 0) {
            this._value =
                this._value.slice(0, this._cursorPos - 1) +
                this._value.slice(this._cursorPos);
            this._cursorPos--;
            this._dismissCompletions();
            this._onChange?.(this._value);
            this.markDirty();
        }
    }

    deleteForward(): void {
        if (this._cursorPos < this._value.length) {
            this._value =
                this._value.slice(0, this._cursorPos) +
                this._value.slice(this._cursorPos + 1);
            this._dismissCompletions();
            this._onChange?.(this._value);
            this.markDirty();
        }
    }

    moveCursorLeft(): void { this._cursorPos = Math.max(0, this._cursorPos - 1); this.markDirty(); }
    moveCursorRight(): void { this._cursorPos = Math.min(this._value.length, this._cursorPos + 1); this.markDirty(); }
    moveCursorHome(): void { this._cursorPos = 0; this.markDirty(); }
    moveCursorEnd(): void { this._cursorPos = this._value.length; this.markDirty(); }
    submit(): void { this._dismissCompletions(); this._onSubmit?.(this._value); }
    clear(): void { this._value = ''; this._cursorPos = 0; this._dismissCompletions(); this._onChange?.(''); this.markDirty(); }

    /**
     * Handle key events. Call this from your input loop.
     *  Tab   — trigger/cycle completions
     *  Esc   — dismiss completions
     *  Enter — submit current value
     */
    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'tab': this.triggerCompletion(); break;
            case 'escape': this._dismissCompletions(); this.markDirty(); break;
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

        // ── Defensive: if height insufficient for completions, hide them ──
        if (height <= 1 && this._showCompletions) {
            this._showCompletions = false;
        }

        // ── Input line ──
        if (this._value.length === 0 && !this.isFocused) {
            screen.writeString(x, y, truncate(this._placeholder, width), { ...attrs, dim: true });
        } else {
            const visibleWidth = width - 1;
            let scrollX = 0;
            if (this._cursorPos > visibleWidth) {
                scrollX = this._cursorPos - visibleWidth;
            }
            const visibleText = this._value.slice(scrollX, scrollX + visibleWidth);
            screen.writeString(x, y, visibleText, attrs);

            if (this.isFocused) {
                const cursorScreenPos = x + this._cursorPos - scrollX;
                if (cursorScreenPos >= x && cursorScreenPos < x + width) {
                    const cursorChar = this._cursorPos < this._value.length
                        ? this._value[this._cursorPos]
                        : ' ';
                    screen.setCell(cursorScreenPos, y, {
                        char: cursorChar,
                        ...attrs,
                        inverse: true,
                    });
                }
            }
        }

        // ── Completion list (rendered below the input line) ──
        // Requires height >= maxCompletions + 2 (input line + separator).
        // Default height=3 shows up to 1 completion.
        if (this._showCompletions && this._completions.length > 0 && height > 1) {
            const maxRows = Math.min(this._completions.length, height - 1);
            for (let i = 0; i < maxRows; i++) {
                const row = y + 1 + i;
                const isSelected = i === this._completionIndex;
                const prefix = isSelected ? (caps.unicode ? '▶ ' : '> ') : '  ';
                const entry = this._completions[i];
                screen.writeString(x, row, truncate(prefix + entry, width), {
                    ...attrs,
                    bold: isSelected,
                    inverse: isSelected,
                });
            }
        }
    }
}
