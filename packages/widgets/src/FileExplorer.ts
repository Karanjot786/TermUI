// ─────────────────────────────────────────────────────
// @termuijs/widgets — Interactive File Explorer Widget
// ─────────────────────────────────────────────────────

export interface FileItem {
    name: string;
    path: string;
    isDirectory: boolean;
}

export interface FileExplorerOptions {
    root?: string;
    multiSelect?: boolean;
    onSelect?: (path: string) => void;
}

export class FileExplorer {
    private _root: string;
    private _files: FileItem[] = [];
    private _selectedIndex = 0;
    private _selectedFiles: Set<string> = new Set();
    private _filter = "";
    private _onSelect?: (path: string) => void;

    constructor(options: FileExplorerOptions = {}) {
        this._root = options.root ?? "./";
        this._onSelect = options.onSelect;
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