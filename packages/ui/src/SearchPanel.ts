export interface SearchPanelOptions {
    placeholder?: string;
    fuzzySearch?: boolean;
    highlightMatches?: boolean;
    shortcut?: string;
}

export class SearchPanel {
    private _query = '';
    readonly options: Required<SearchPanelOptions>;

    constructor(options: SearchPanelOptions = {}) {
        this.options = {
            placeholder: options.placeholder ?? 'Search...',
            fuzzySearch: options.fuzzySearch ?? true,
            highlightMatches: options.highlightMatches ?? true,
            shortcut: options.shortcut ?? 'Ctrl+F',
        };
    }

    get query(): string { return this._query; }

    setQuery(value: string): void { this._query = value; }

    search(items: string[]): string[] {
        if (!this._query) return items;
        const q = this._query.toLowerCase();
        return items.filter(item => item.toLowerCase().includes(q));
    }

    clear(): void { this._query = ''; }
}
