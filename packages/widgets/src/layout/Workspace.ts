// ─────────────────────────────────────────────────────
// @termuijs/widgets — Workspace
// Layout persistence and workspace management
// ─────────────────────────────────────────────────────

export interface WorkspaceLayout {
    id: string;
    panels: unknown[];
}

export interface WorkspaceStorage {
    save(name: string, data: string): void;
    load(name: string): string | null;
}

export interface WorkspaceOptions {
    defaultWorkspace?: string;
}

export class Workspace {
    private layouts = new Map<string, WorkspaceLayout>();
    private activeWorkspace: string;

    constructor(options: WorkspaceOptions = {}) {
        this.activeWorkspace = options.defaultWorkspace ?? "default";
    }

    saveLayout(name: string, layout: WorkspaceLayout): void {
        this.layouts.set(name, layout);
    }

    loadLayout(name: string): WorkspaceLayout | undefined {
        return this.layouts.get(name);
    }

    switchWorkspace(name: string): void {
        if (this.layouts.has(name)) {
            this.activeWorkspace = name;
        }
    }

    getCurrentWorkspace(): string {
        return this.activeWorkspace;
    }

    getWorkspaceNames(): string[] {
        return [...this.layouts.keys()];
    }

    removeWorkspace(name: string): void {
        this.layouts.delete(name);
    }

    clear(): void {
        this.layouts.clear();
    }

    save(storage: WorkspaceStorage): void {
        storage.save(
            this.activeWorkspace,
            JSON.stringify([...this.layouts])
        );
    }

    restore(storage: WorkspaceStorage): void {
        const data = storage.load(this.activeWorkspace);

        if (!data) return;

        this.layouts = new Map(
            JSON.parse(data)
        );
    }
}