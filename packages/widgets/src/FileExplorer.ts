// ─────────────────────────────────────────────────────
// @termuijs/widgets — Interactive File Explorer Widget
// ─────────────────────────────────────────────────────

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
}

export class FileExplorer {
    private _root: string;
    private _files: FileItem[] = [];
    private _selectedIndex = 0;
    private _selectedFiles: Set<string> = new Set();
    private _filter = "";
    private _onSelect?: (path: string) => void;
    private _sortBy: 'name' | 'size' | 'date';
    private _sortOrder: 'asc' | 'desc';

    constructor(options: FileExplorerOptions = {}) {
        this._root = options.root ?? "./";
        this._onSelect = options.onSelect;
        this._sortBy = options.sortBy ?? 'name';
        this._sortOrder = options.sortOrder ?? 'asc';
    }

    /**
     * Read directory and load files into the explorer based on OS file metadata.
     */
    reload(): void {
        let files: string[] = [];
        try {
            files = readdirSync(this._root);
        } catch {
            files = [];
        }

        const mappedFiles: FileItem[] = files.map(file => {
            const filePath = join(this._root, file);
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
            return { name: file, path: filePath, isDirectory, size, date };
        });

        mappedFiles.sort((a, b) => {
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

        this.setFiles(mappedFiles);
    }

    /**
     * Load files into the explorer.
     * This can later be connected to the filesystem API.
     */
    setFiles(files: FileItem[]): void {
        this._files = files;
        this._selectedIndex = 0;
    }

    /**
     * Move selection down.
     */
    next(): void {
        if (this._selectedIndex < this._files.length - 1) {
            this._selectedIndex++;
        }
    }

    /**
     * Move selection up.
     */
    previous(): void {
        if (this._selectedIndex > 0) {
            this._selectedIndex--;
        }
    }

    /**
     * Select current file.
     */
    select(): void {
        const file = this._files[this._selectedIndex];

        if (!file) return;

        this._selectedFiles.add(file.path);

        if (this._onSelect) {
            this._onSelect(file.path);
        }
    }

    /**
     * Search and filter files.
     */
    search(query: string): FileItem[] {
        this._filter = query.toLowerCase();

        return this._files.filter(file =>
            file.name.toLowerCase().includes(this._filter)
        );
    }

    /**
     * Get current selected item.
     */
    get current(): FileItem | undefined {
        return this._files[this._selectedIndex];
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
}
