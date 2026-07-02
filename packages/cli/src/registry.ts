export interface ResolvedComponent {
    name: string;
    slug: string;
    files: Array<{ path: string; content: string }>;
    dependencies: string[];
}

const BASE_URL = process.env.TERMUI_REGISTRY_URL ?? 'https://termui.io';

/** Fetch a single component's registry JSON (with files + dependencies). */
export async function resolveComponent(slug: string): Promise<ResolvedComponent> {
    const url = `${BASE_URL}/r/${slug}.json`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Component "${slug}" not found in registry (${res.status} ${url}).`);
    }
    const json = await res.json() as Partial<ResolvedComponent>;
    if (!json.files || json.files.length === 0) {
        throw new Error(`Component "${slug}" has no source files in the registry.`);
    }
    return {
        name: json.name ?? slug,
        slug,
        files: json.files,
        dependencies: json.dependencies ?? [],
    };
}

/** Fetch the master list of available components. */
export async function listComponents(): Promise<Array<{ slug: string; name: string; description?: string }>> {
    const url = `${BASE_URL}/r/registry.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load registry index (${res.status} ${url}).`);
    return await res.json() as Array<{ slug: string; name: string; description?: string }>;
}
