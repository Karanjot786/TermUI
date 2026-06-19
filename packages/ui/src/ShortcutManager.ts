export interface Shortcut {
    command: string;
    keys: string;
    category?: string;
}

export class ShortcutManager {
    private shortcuts: Shortcut[] = [];

    constructor(shortcuts: Shortcut[] = []) {
        this.shortcuts = shortcuts;
    }

    getShortcuts(): Shortcut[] {
        return this.shortcuts;
    }

    search(query: string): Shortcut[] {
        const value = query.toLowerCase();

        return this.shortcuts.filter(shortcut =>
            shortcut.command.toLowerCase().includes(value) ||
            shortcut.keys.toLowerCase().includes(value)
        );
    }

    addShortcut(shortcut: Shortcut): void {
        this.shortcuts.push(shortcut);
    }

    updateShortcut(command: string, newKeys: string): void {
        const shortcut = this.shortcuts.find(
            item => item.command === command
        );

        if (shortcut) {
            shortcut.keys = newKeys;
        }
    }

    exportConfig(): string {
        return JSON.stringify(this.shortcuts, null, 2);
    }

    importConfig(config: string): void {
        this.shortcuts = JSON.parse(config);
    }
}