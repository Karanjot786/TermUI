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

function isWorkspaceLayout(value: unknown): value is WorkspaceLayout {
    return typeof value === "object"
        && value !== null
        && typeof (value as WorkspaceLayout).id === "string"
        && Array.isArray((value as WorkspaceLayout).panels);
}

function parseLayouts(data: string): Map<string, WorkspaceLayout> | null {
    try {
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return null;

        const layouts = new Map<string, WorkspaceLayout>();
        for (const entry of parsed) {
            if (!Array.isArray(entry) || entry.length !== 2) return null;

            const [name, layout] = entry;
            if (typeof name !== "string" || !isWorkspaceLayout(layout)) return null;

            layouts.set(name, layout);
        }

        return layouts;
    } catch {
        return null;
    }
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

        const layouts = parseLayouts(data);
        if (!layouts) return;

        this.layouts = layouts;
    }
}
