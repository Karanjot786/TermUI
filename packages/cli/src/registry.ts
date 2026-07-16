export interface ResolvedComponent {
    name: string;
    slug: string;
    files: Array<{ path: string; content: string }>;
    dependencies: string[];
}

interface RegistryComponentJson extends Partial<ResolvedComponent> {
    deps?: string[];
    peerDeps?: string[];
}

const BASE_URL = process.env.TERMUI_REGISTRY_URL ?? 'https://termui.io';

export async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
    const controller = new AbortController();
    const { signal: controllerSignal } = controller;

    let timedOut = false;

    if (init?.signal) {
        const parentSignal = init.signal;
        if (parentSignal.aborted) {
            controller.abort();
        } else {
            parentSignal.addEventListener('abort', () => {
                controller.abort();
            });
        }
    }

    const id = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    try {
        const response = await fetch(url, { ...init, signal: controllerSignal });
        return response;
    } catch (err: any) {
        if (timedOut) {
            throw new Error(`Request to registry timed out after ${timeoutMs}ms.`);
        }
        if (err.name === 'AbortError') {
            throw new Error(`Request to registry was aborted.`);
        }
        throw err;
    } finally {
        clearTimeout(id);
    }
}

/** Fetch a single component's registry JSON (with files + dependencies). */
export async function resolveComponent(slug: string): Promise<ResolvedComponent> {
    const url = `${BASE_URL}/r/${slug}.json`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
        throw new Error(`Component "${slug}" not found in registry (${res.status} ${url}).`);
    }
    const json = await res.json() as RegistryComponentJson;
    if (!json.files || json.files.length === 0) {
        throw new Error(`Component "${slug}" has no source files in the registry.`);
    }
    const dependencies = [
        ...new Set([
            ...(json.dependencies ?? []),
            ...(json.deps ?? []),
            ...(json.peerDeps ?? []),
        ]),
    ].sort();
    return {
        name: json.name ?? slug,
        slug,
        files: json.files,
        dependencies,
    };
}

/** Fetch the master list of available components. */
export async function listComponents(): Promise<Array<{ slug: string; name: string; description?: string }>> {
    const url = `${BASE_URL}/r/registry.json`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Failed to load registry index (${res.status} ${url}).`);
    return await res.json() as Array<{ slug: string; name: string; description?: string }>;
}
