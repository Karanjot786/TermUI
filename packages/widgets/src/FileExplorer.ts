// ─────────────────────────────────────────────────────
// @termuijs/widgets — Interactive File Explorer Widget
// ─────────────────────────────────────────────────────

import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { type Screen, type Style, type KeyEvent, styleToCellAttrs, stringWidth, truncate, caps } from '@termuijs/core';
import { Widget } from './base/Widget.js';

export interface FileItem {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    date?: number;
}

export interface FileExplorerOptions {
    root?: string;
    multiSelect?: boolean;
    onSelect?: (path: string) => void;
    sortBy?: 'name' | 'size' | 'date';
    sortOrder?: 'asc' | 'desc';
    /** When true, dotfiles (names starting with `.`) are shown. */
    hiddenFiles?: boolean;
}

interface VisibleRow {
    item: FileItem;
    depth: number;
}

/**
 * FileExplorer — a keyboard-driven terminal file browser.
 *
 * Renders the contents of a directory as a tree of file/directory rows with
 * icons, a header showing the current path, and a highlighted selection.
 * Directories can be expanded inline to reveal their children, files can be
 * selected, and hidden (dot) files can be toggled on and off.
 *
 * Keyboard controls (when focused):
 * - Up / Down:   move the selection
 * - Enter:       expand/collapse a directory, or select a file
 * - Backspace:   navigate to the parent directory
 * - `/` or Ctrl+F: toggle hidden files
 */
export class FileExplorer extends Widget {
    private _root: string;
    private _files: FileItem[] = [];
    private _selectedIndex = 0;
    private _scrollOffset = 0;
    private _selectedFiles: Set<string> = new Set();
    private _filter = "";
    private _onSelect?: (path: string) => void;
    private _sortBy: 'name' | 'size' | 'date';
    private _sortOrder: 'asc' | 'desc';
    private _showHidden: boolean;

    /** Expanded directory paths (absolute). */
    private _expanded: Set<string> = new Set();
    /** Lazy cache of loaded directory children, keyed by absolute path. */
    private _childCache: Map<string, FileItem[]> = new Map();

    constructor(options: FileExplorerOptions = {}, style: Partial<Style> = {}) {
        super(style);

        this._root = options.root ?? "./";
        this._onSelect = options.onSelect;
        this._sortBy = options.sortBy ?? 'name';
        this._sortOrder = options.sortOrder ?? 'asc';
        this._showHidden = options.hiddenFiles ?? false;

        this.focusable = true;
        this.events.on('key', this.handleKey.bind(this));
    }

    // ── Data loading ──────────────────────────────────

    /**
     * Read the current directory (and apply the active sort + hidden filter)
     * and load its entries into the explorer.
     */
    reload(): void {
        this.setFiles(this._loadDir(this._root));
    }

    /**
     * Load and sort the entries of a directory on disk.
     */
    private _loadDir(path: string): FileItem[] {
        let names: string[] = [];
        try {
            names = readdirSync(path);
        } catch {
            names = [];
        }

        const items: FileItem[] = names
            .filter(name => this._showHidden || !name.startsWith('.'))
            .map(name => this._stat(join(path, name), name));

        return this._sortItems(items);
    }

    /**
     * Build a {@link FileItem} for a single path, tolerating stat errors
     * (broken symlinks, permission errors).
     */
    private _stat(filePath: string, name: string): FileItem {
        let size = 0;
        let date = 0;
        let isDirectory = false;
        try {
            const stats = statSync(filePath);
            size = stats.size;
            date = stats.mtimeMs;
            isDirectory = stats.isDirectory();
        } catch {
            // Ignore stat errors for broken symlinks/permissions
        }
        return { name, path: filePath, isDirectory, size, date };
    }

    /**
     * Sort a list of files. Directories always come first, then the list is
     * ordered by the configured `sortBy` / `sortOrder`.
     */
    private _sortItems(items: FileItem[]): FileItem[] {
        return items.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            let diff = 0;
            if (this._sortBy === 'size') {
                diff = (a.size || 0) - (b.size || 0);
            } else if (this._sortBy === 'date') {
                diff = (a.date || 0) - (b.date || 0);
            } else {
                diff = a.name.localeCompare(b.name);
            }
            return this._sortOrder === 'desc' ? -diff : diff;
        });
    }

    /**
     * Load files into the explorer. Used for testing or external data sources.
     */
    setFiles(files: FileItem[]): void {
        this._files = files;
        this._selectedIndex = 0;
        this._scrollOffset = 0;
        this._expanded.clear();
        this._childCache.clear();
        this.markDirty();
    }

    // ── Navigation ────────────────────────────────────

    /**
     * Move selection down by one visible row.
     */
    next(): void {
        const rows = this._getVisibleRows();
        if (this._selectedIndex < rows.length - 1) {
            this._selectedIndex++;
            this._clampScroll();
            this.markDirty();
        }
    }

    /**
     * Move selection up by one visible row.
     */
    previous(): void {
        if (this._selectedIndex > 0) {
            this._selectedIndex--;
            this._clampScroll();
            this.markDirty();
        }
    }

    /**
     * Select the current item, recording its path and firing `onSelect`.
     * Directory expansion/collapse is handled separately by `handleKey`.
     */
    select(): void {
        const row = this._getVisibleRows()[this._selectedIndex];
        if (!row) return;

        this._selectedFiles.add(row.item.path);
        this._onSelect?.(row.item.path);
        this.markDirty();
    }

    /**
     * Expand or collapse a directory, loading its children lazily.
     */
    private _toggleExpand(item: FileItem): void {
        if (!item.isDirectory) return;
        if (this._expanded.has(item.path)) {
            this._expanded.delete(item.path);
        } else {
            this._expanded.add(item.path);
            if (!this._childCache.has(item.path)) {
                this._childCache.set(item.path, this._loadDir(item.path));
            }
        }
        this.markDirty();
    }

    /**
     * Navigate into a directory (replacing the root) and reload.
     */
    private _enterDirectory(item: FileItem): void {
        if (!item.isDirectory) return;
        this._root = item.path;
        this.reload();
    }

    /**
     * Navigate to the parent directory of the current root.
     */
    private _goUp(): void {
        const parent = dirname(this._root);
        if (parent === this._root) return;
        this._root = parent;
        this.reload();
    }

    // ── Hidden files ──────────────────────────────────

    /**
     * Toggle whether hidden (dot) files are shown, reloading the listing.
     */
    toggleHiddenFiles(): void {
        this._showHidden = !this._showHidden;
        this._childCache.clear();
        this.reload();
    }

    /** Current hidden-file visibility. */
    get showHidden(): boolean {
        return this._showHidden;
    }

    // ── Keyboard handling ─────────────────────────────

    /**
     * Handle a key event when the widget is focused.
     */
    handleKey(event: KeyEvent): void {
        const key = (event.key || '').toLowerCase();

        switch (key) {
            case 'up':
            case 'arrowup':
            case 'k': // vim-style
                this.previous();
                return;
            case 'down':
            case 'arrowdown':
            case 'j': // vim-style
                this.next();
                return;
            case 'enter':
            case 'right':
            case 'l': { // vim-style
                const row = this._getVisibleRows()[this._selectedIndex];
                if (row) {
                    if (row.item.isDirectory) {
                        this._toggleExpand(row.item);
                    } else {
                        this.select();
                    }
                }
                return;
            }
            case 'backspace':
                this._goUp();
                return;
            case '/':
            case 'f':
                if (key === '/' || event.ctrl) {
                    this.toggleHiddenFiles();
                    return;
                }
                return;
        }
    }

    // ── Search ────────────────────────────────────────

    /**
     * Search and filter files (case-insensitive substring match on name).
     */
    search(query: string): FileItem[] {
        this._filter = query.toLowerCase();

        return this._files.filter(file =>
            file.name.toLowerCase().includes(this._filter)
        );
    }

    // ── Visible rows ──────────────────────────────────

    /**
     * Flatten the current directory tree into the list of rows that should be
     * displayed, honouring expanded directories and indentation depth.
     */
    private _getVisibleRows(): VisibleRow[] {
        const rows: VisibleRow[] = [];
        const walk = (items: FileItem[], depth: number): void => {
            for (const item of items) {
                rows.push({ item, depth });
                if (item.isDirectory && this._expanded.has(item.path)) {
                    const children = this._childCache.get(item.path) ?? this._loadDir(item.path);
                    walk(children, depth + 1);
                }
            }
        };
        walk(this._files, 0);
        return rows;
    }

    /**
     * Keep the selection visible within the available height, accounting for
     * the header row.
     */
    private _clampScroll(): void {
        const rect = this._getContentRect();
        const listHeight = Math.max(0, rect.height - 1);
        if (listHeight <= 0) {
            this._scrollOffset = 0;
            return;
        }

        const rows = this._getVisibleRows();
        const maxOffset = Math.max(0, rows.length - listHeight);

        if (this._selectedIndex < this._scrollOffset) {
            this._scrollOffset = this._selectedIndex;
        }
        if (this._selectedIndex >= this._scrollOffset + listHeight) {
            this._scrollOffset = this._selectedIndex - listHeight + 1;
        }
        if (this._scrollOffset > maxOffset) {
            this._scrollOffset = maxOffset;
        }
        if (this._scrollOffset < 0) {
            this._scrollOffset = 0;
        }
    }

    // ── Lifecycle ─────────────────────────────────────

    mount(): void {
        if (this._files.length === 0) {
            this.reload();
        }
        super.mount();
    }

    // ── Getters ───────────────────────────────────────

    /**
     * Get current selected item.
     */
    get current(): FileItem | undefined {
        return this._getVisibleRows()[this._selectedIndex]?.item;
    }

    /**
     * Get all selected files.
     */
    get selected(): string[] {
        return Array.from(this._selectedFiles);
    }

    /**
     * Get current directory.
     */
    get root(): string {
        return this._root;
    }

    // ── Rendering ─────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Header: current path
        const header = truncate(this._root, width, '');
        screen.writeString(x, y, header, { ...attrs, bold: true });

        const listHeight = Math.max(0, height - 1);
        const rows = this._getVisibleRows();

        const dirIcon = caps.unicode ? '📁' : '[D]';
        const fileIcon = caps.unicode ? '📄' : '[F]';

        for (let i = 0; i < listHeight; i++) {
            const rowIdx = i + this._scrollOffset;
            if (rowIdx >= rows.length) break;

            const { item, depth } = rows[rowIdx];
            const isSelected = rowIdx === this._selectedIndex;

            const icon = item.isDirectory ? dirIcon : fileIcon;
            const indent = '  '.repeat(depth);
            const displayName = item.isDirectory ? `${item.name}/` : item.name;
            let line = `${icon} ${indent}${displayName}`;
            if (stringWidth(line) > width) {
                line = truncate(line, width, '');
            }

            const cellStyle = {
                ...attrs,
                bold: isSelected,
                bg: (isSelected && this.isFocused)
                    ? { type: 'named' as const, name: 'blue' as const }
                    : undefined,
            };

            screen.writeString(x, y + 1 + i, line, cellStyle);

            // Fill the rest of the row with the highlight background.
            if (isSelected && this.isFocused) {
                const remaining = width - stringWidth(line);
                for (let c = 0; c < remaining; c++) {
                    screen.setCell(x + stringWidth(line) + c, y + 1 + i, { char: ' ', ...cellStyle });
                }
            }
        }
    }
}
