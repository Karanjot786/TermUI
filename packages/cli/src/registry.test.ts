import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveComponent, listComponents, fetchWithTimeout } from './registry.js';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
});

describe('resolveComponent', () => {
    it('returns name/files/dependencies on 200', async () => {
        globalThis.fetch = (async () => new Response(JSON.stringify({
            name: 'Spinner', slug: 'spinner',
            files: [{ path: 'spinner.ts', content: 'x' }],
            dependencies: ['@termuijs/core'],
        }), { status: 200 })) as typeof fetch;
        const c = await resolveComponent('spinner');
        expect(c.name).toBe('Spinner');
        expect(c.files[0]!.path).toBe('spinner.ts');
        expect(c.dependencies).toEqual(['@termuijs/core']);
    });

    it('normalizes deps and peerDeps from registry metadata', async () => {
        globalThis.fetch = (async () => new Response(JSON.stringify({
            name: 'Spinner',
            files: [{ path: 'spinner.ts', content: 'x' }],
            dependencies: ['@termuijs/core'],
            deps: ['@termuijs/widgets'],
            peerDeps: ['@termuijs/core'],
        }), { status: 200 })) as typeof fetch;

        const c = await resolveComponent('spinner');
        expect(c.dependencies).toEqual(['@termuijs/core', '@termuijs/widgets']);
    });

    it('throws a helpful error on 404', async () => {
        globalThis.fetch = (async () => new Response('not found', { status: 404 })) as typeof fetch;
        await expect(resolveComponent('nope')).rejects.toThrow(/not found in registry/);
    });

    it('throws a timeout error if request takes too long', async () => {
        vi.useFakeTimers();
        globalThis.fetch = (async (url, init) => {
            return new Promise((resolve, reject) => {
                if (init?.signal) {
                    init.signal.addEventListener('abort', () => {
                        const err = new Error('The operation was aborted.');
                        err.name = 'AbortError';
                        reject(err);
                    });
                }
            });
        }) as typeof fetch;

        const promise = resolveComponent('spinner');
        vi.advanceTimersByTime(10000);
        await expect(promise).rejects.toThrow(/Request to registry timed out/);
        vi.useRealTimers();
    });
});

describe('listComponents', () => {
    it('returns master list on 200', async () => {
        globalThis.fetch = (async () => new Response(JSON.stringify([
            { slug: 'spinner', name: 'Spinner', description: 'A loader' }
        ]), { status: 200 })) as typeof fetch;
        const list = await listComponents();
        expect(list).toEqual([{ slug: 'spinner', name: 'Spinner', description: 'A loader' }]);
    });
});

describe('fetchWithTimeout', () => {
    it('supports successful fetches', async () => {
        globalThis.fetch = (async () => new Response('ok', { status: 200 })) as typeof fetch;
        const res = await fetchWithTimeout('https://example.com');
        expect(res.status).toBe(200);
    });

    it('aborts when parent signal is already aborted', async () => {
        const parentController = new AbortController();
        parentController.abort();

        globalThis.fetch = (async (url, init) => {
            if (init?.signal?.aborted) {
                const err = new Error('Aborted');
                err.name = 'AbortError';
                throw err;
            }
            return new Response('ok');
        }) as typeof fetch;

        await expect(fetchWithTimeout('https://example.com', { signal: parentController.signal }))
            .rejects.toThrow(/Request to registry was aborted/);
    });

    it('aborts when parent signal is aborted mid-request', async () => {
        const parentController = new AbortController();

        globalThis.fetch = (async (url, init) => {
            return new Promise((resolve, reject) => {
                if (init?.signal) {
                    init.signal.addEventListener('abort', () => {
                        const err = new Error('Aborted');
                        err.name = 'AbortError';
                        reject(err);
                    });
                }
                // Simulate mid-request abort
                setTimeout(() => parentController.abort(), 50);
            });
        }) as typeof fetch;

        await expect(fetchWithTimeout('https://example.com', { signal: parentController.signal }))
            .rejects.toThrow(/Request to registry was aborted/);
    });
});
