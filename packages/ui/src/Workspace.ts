export interface WorkspaceOptions {
    tabs: string[];
    activeTab?: number;
    shortcutEnabled?: boolean;
    onTabChange?: (index: number, label: string) => void;
}

export class Workspace {
    private _tabs: string[];
    private _active: number;
    readonly shortcutEnabled: boolean;
    onTabChange?: (index: number, label: string) => void;

    constructor(options: WorkspaceOptions) {
        this._tabs = [...options.tabs];
        this._active = Math.max(0, Math.min(options.activeTab ?? 0, options.tabs.length - 1));
        this.shortcutEnabled = options.shortcutEnabled ?? true;
        this.onTabChange = options.onTabChange;
    }

    get tabs(): string[] { return [...this._tabs]; }
    get activeIndex(): number { return this._active; }
    get activeTab(): string { return this._tabs[this._active]; }

    switchTab(index: number): void {
        if (index < 0 || index >= this._tabs.length || index === this._active) return;
        this._active = index;
        this.onTabChange?.(index, this._tabs[index]);
    }

    nextTab(): void { this.switchTab((this._active + 1) % this._tabs.length); }
    previousTab(): void { this.switchTab((this._active - 1 + this._tabs.length) % this._tabs.length); }

    saveLayout(): string {
        return JSON.stringify({ tabs: this._tabs, activeIndex: this._active });
    }

    loadLayout(layout: string): void {
        const data = JSON.parse(layout) as { tabs: string[]; activeIndex: number };
        this._tabs = data.tabs;
        this._active = data.activeIndex;
    }
}
