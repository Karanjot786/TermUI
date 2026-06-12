export interface Shortcut {
    key: string;
    description: string;
    category?: string;
}

const shortcuts: Shortcut[] = [];

export function registerShortcut(shortcut: Shortcut): void {
    shortcuts.push(shortcut);
}

export function useShortcuts(): Shortcut[] {
    return shortcuts;
}