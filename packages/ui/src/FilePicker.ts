// ─────────────────────────────────────────────────────
// @termuijs/ui — FilePicker widget
//
// Interactive file browser:
//   ↑ / ↓    Move selection
//   Enter     Open directory | fire onSelect for file
//   Backspace Navigate to parent directory
//   Escape    Fire onCancel
// ─────────────────────────────────────────────────────

import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
    truncate,
} from '@termuijs/core';

// ── Types ────────────────────────────────────────────

/** A single entry shown in the file picker list. */
export interface FileEntry {
    /** Basename only (never a full path). */
    name: string;
    /** True when the entry is a directory. */
    isDir: boolean;
    /** Resolved absolute path. */
    fullPath: string;
}

export interface FilePickerOptions {
    /** Initial directory. Defaults to `process.cwd()`. */
    startPath?: string;
    /**
     * Extension filter (e.g. `['.ts', '.tsx']`).
     * When provided, only files whose extension matches are shown.
     * Directories are always shown regardless of this filter.
     */
    filter?: string[];
    /** Show dot-files / dot-directories. Default: `false`. */
    showHidden?: boolean;
    /** Foreground colour for directory entries. Default: cyan. */
    dirColor?: Style['fg'];
    /** Foreground colour for file entries. Default: white. */
    fileColor?: Style['fg'];
    /** Foreground colour for the highlighted (active) row. Default: yellow. */
    activeColor?: Style['fg'];
    /** Called with the absolute path when the user selects a file. */
    onSelect?: (path: string) => void;
    /** Called when the user presses Escape. */
    onCancel?: () => void;
}

// ── Widget ───────────────────────────────────────────

/**
 * FilePicker — an interactive file browser widget.
 *
 * Wire keyboard events via `handleKey(event)`.
 * The widget is self-contained: it reads the filesystem on construction
 * and every time the directory changes.
 */
export class FilePicker extends Widget {
    private _cwd: string;
    private _filter: string[];
    private _showHidden: boolean;
    private _entries: FileEntry[] = [];
    private _cursor = 0;
    private _scrollTop = 0;

    private _dirColor: Style['fg'];
    private _fileColor: Style['fg'];
    private _activeColor: Style['fg'];

    private _onSelect?: (path: string) => void;
    private _onCancel?: () => void;

    focusable = true;

    constructor(options: FilePickerOptions = {}) {
        super(mergeStyles(defaultStyle(), { flexGrow: 1 }));
        this._cwd = nodePath.resolve(options.startPath ?? process.cwd());
        this._filter = options.filter ?? [];
        this._showHidden = options.showHidden ?? false;
        this._dirColor = options.dirColor ?? { type: 'named', name: 'cyan' };
        this._fileColor = options.fileColor ?? { type: 'named', name: 'white' };
        this._activeColor = options.activeColor ?? { type: 'named', name: 'yellow' };
        this._onSelect = options.onSelect;
        this._onCancel = options.onCancel;

        this._loadEntries();
    }

    // ── Public accessors ─────────────────────────────

    /** The absolute path of the directory currently being displayed. */
    get currentPath(): string { return this._cwd; }

    /** The `FileEntry` the cursor is currently on, or `undefined` if the list is empty. */
    get selectedEntry(): FileEntry | undefined { return this._entries[this._cursor]; }

    /** Read-only snapshot of the currently visible entries. */
    get entries(): readonly FileEntry[] { return this._entries; }

    /** Current cursor index within `entries`. */
    get cursorIndex(): number { return this._cursor; }

    // ── Navigation ───────────────────────────────────

    /** Move the cursor one row down. Clamps at the last entry. */
    selectNext(): void {
        if (this._cursor < this._entries.length - 1) {
            this._cursor++;
            this.markDirty();
        }
    }

    /** Move the cursor one row up. Clamps at the first entry. */
    selectPrev(): void {
        if (this._cursor > 0) {
            this._cursor--;
            this.markDirty();
        }
    }

    /**
     * Confirm the current selection:
     * - If the entry is a directory (including `..`), navigate into it.
     * - If the entry is a file, fire `onSelect(fullPath)`.
     */
    confirm(): void {
        const entry = this._entries[this._cursor];
        if (!entry) return;

        if (entry.isDir) {
            this._navigateTo(entry.fullPath);
        } else {
            this._onSelect?.(entry.fullPath);
        }
    }

    /**
     * Navigate to the parent directory.
     * No-ops when already at the filesystem root.
     */
    goUp(): void {
        const parent = nodePath.dirname(this._cwd);
        if (parent !== this._cwd) {          // at root dirname(root) === root
            this._navigateTo(parent);
        }
    }

    /** Fire `onCancel`. */
    cancel(): void {
        this._onCancel?.();
    }

    /**
     * Convenience key handler. Wire this to your app's input loop.
     *
     * | Key               | Action         |
     * |-------------------|----------------|
     * | `up` / `k`        | `selectPrev()` |
     * | `down` / `j`      | `selectNext()` |
     * | `enter`/`return`  | `confirm()`    |
     * | `backspace`       | `goUp()`       |
     * | `escape`          | `cancel()`     |
     */
    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':        this.selectPrev(); break;
            case 'k':         if (!event.ctrl && !event.alt) this.selectPrev(); break;
            case 'down':      this.selectNext(); break;
            case 'j':         if (!event.ctrl && !event.alt) this.selectNext(); break;
            case 'enter':
            case 'return':    this.confirm(); break;
            case 'backspace': this.goUp(); break;
            case 'escape':    this.cancel(); break;
        }
    }

    // ── Filesystem ───────────────────────────────────

    /**
     * Navigate to an absolute directory path.
     * Reloads the entry list and resets cursor / scroll.
     */
    private _navigateTo(absPath: string): void {
        this._cwd = absPath;
        this._loadEntries();
        // _loadEntries resets cursor and calls markDirty
    }

    /**
     * Read `this._cwd` and populate `this._entries`.
     *
     * Layout:
     *  1. `..` parent entry (omitted at root)
     *  2. Directories — alpha-sorted
     *  3. Files       — alpha-sorted, filtered by `this._filter`
     */
    private _loadEntries(): void {
        const entries: FileEntry[] = [];

        // Parent entry (unless at root)
        const parent = nodePath.dirname(this._cwd);
        if (parent !== this._cwd) {
            entries.push({ name: '..', isDir: true, fullPath: parent });
        }

        try {
            const dirents = fs.readdirSync(this._cwd, { withFileTypes: true });

            const dirs: FileEntry[] = [];
            const files: FileEntry[] = [];

            for (const dirent of dirents) {
                // Skip hidden entries unless explicitly shown
                if (!this._showHidden && dirent.name.startsWith('.')) continue;

                const fullPath = nodePath.join(this._cwd, dirent.name);
                const isDir = dirent.isDirectory() || dirent.isSymbolicLink() && this._isDir(fullPath);

                if (isDir) {
                    dirs.push({ name: dirent.name, isDir: true, fullPath });
                } else {
                    // Apply extension filter to files only
                    if (this._filter.length > 0) {
                        const ext = nodePath.extname(dirent.name);
                        if (!this._filter.includes(ext)) continue;
                    }
                    files.push({ name: dirent.name, isDir: false, fullPath });
                }
            }

            // Sort each group alphabetically (case-insensitive)
            const alpha = (a: FileEntry, b: FileEntry) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase());

            dirs.sort(alpha);
            files.sort(alpha);

            entries.push(...dirs, ...files);
        } catch {
            // Permission denied or directory removed — show only the `..` entry
        }

        this._entries = entries;
        this._cursor = 0;
        this._scrollTop = 0;
        this.markDirty();
    }

    /** Safe stat to check if a symlink target is a directory. Never throws. */
    private _isDir(p: string): boolean {
        try { return fs.statSync(p).isDirectory(); } catch { return false; }
    }

    // ── Rendering ────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // ── Row 0: path header ────────────────────────
        const headerIcon = caps.unicode ? '📁 ' : '> ';
        const headerText = truncate(headerIcon + this._cwd, width);
        screen.writeString(x, y, headerText, {
            ...attrs,
            fg: this._dirColor,
            bold: true,
        });

        if (height < 2) return;

        // ── Row 1: separator ─────────────────────────
        const sep = caps.unicode ? '─'.repeat(width) : '-'.repeat(width);
        screen.writeString(x, y + 1, sep, { ...attrs, dim: true });

        // ── Rows 2+: entries ─────────────────────────
        const listTop = y + 2;
        const listHeight = height - 2;
        if (listHeight <= 0) return;

        // Scroll the viewport so the cursor stays visible
        if (this._cursor < this._scrollTop) {
            this._scrollTop = this._cursor;
        } else if (this._cursor >= this._scrollTop + listHeight) {
            this._scrollTop = this._cursor - listHeight + 1;
        }

        for (let i = 0; i < listHeight; i++) {
            const entryIdx = this._scrollTop + i;
            const entry = this._entries[entryIdx];
            const row = listTop + i;

            if (!entry) {
                // Blank the row so stale characters don't linger
                screen.writeString(x, row, ' '.repeat(width), attrs);
                continue;
            }

            const isActive = entryIdx === this._cursor;

            const icon = entry.isDir
                ? (caps.unicode ? (entry.name === '..' ? '↩ ' : '📂 ') : (entry.name === '..' ? '.. ' : 'd  '))
                : (caps.unicode ? '   ' : '   ');

            const label = truncate(icon + entry.name, width);

            const fg = isActive
                ? this._activeColor
                : entry.isDir
                    ? this._dirColor
                    : this._fileColor;

            screen.writeString(x, row, label.padEnd(width), {
                ...attrs,
                fg,
                bold: isActive,
                inverse: isActive,
            });
        }
    }
}
