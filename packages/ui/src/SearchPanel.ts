export interface SearchPanelOptions {
  placeholder?: string;
  fuzzySearch?: boolean;
  highlightMatches?: boolean;
  shortcut?: string;
}

export class SearchPanel {
  private query = "";
  private options: SearchPanelOptions;

  constructor(options: SearchPanelOptions = {}) {
    this.options = {
      placeholder: "Search...",
      fuzzySearch: true,
      highlightMatches: true,
      shortcut: "Ctrl+F",
      ...options,
    };
  }

  setQuery(value: string): void {
    this.query = value;
  }

  getQuery(): string {
    return this.query;
  }

  search(items: string[]): string[] {
    if (!this.query) return items;

    return items.filter((item) =>
      item.toLowerCase().includes(this.query.toLowerCase())
    );
  }

  clear(): void {
    this.query = "";
  }
}