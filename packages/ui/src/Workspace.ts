export interface WorkspaceOptions {
  tabs: string[];
  activeTab?: number;
  shortcutEnabled?: boolean;
}

export class Workspace {
  private tabs: string[];
  private activeIndex: number;
  private shortcutEnabled: boolean;

  constructor(options: WorkspaceOptions) {
    this.tabs = options.tabs;
    this.activeIndex = options.activeTab ?? 0;
    this.shortcutEnabled = options.shortcutEnabled ?? true;
  }

  getTabs(): string[] {
    return this.tabs;
  }

  getActiveTab(): string {
    return this.tabs[this.activeIndex];
  }

  switchTab(index: number): void {
    if (index >= 0 && index < this.tabs.length) {
      this.activeIndex = index;
    }
  }

  nextTab(): void {
    this.activeIndex =
      (this.activeIndex + 1) % this.tabs.length;
  }

  previousTab(): void {
    this.activeIndex =
      (this.activeIndex - 1 + this.tabs.length) %
      this.tabs.length;
  }

  saveLayout(): string {
    return JSON.stringify({
      tabs: this.tabs,
      activeIndex: this.activeIndex,
    });
  }

  loadLayout(layout: string): void {
    const data = JSON.parse(layout);

    this.tabs = data.tabs;
    this.activeIndex = data.activeIndex;
  }

  isShortcutEnabled(): boolean {
    return this.shortcutEnabled;
  }
}
