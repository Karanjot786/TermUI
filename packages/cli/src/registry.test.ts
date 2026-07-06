import { describe, it, expect, afterEach } from 'vitest';
import { resolveComponent } from './registry.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

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

    it('throws a helpful error on 404', async () => {
        globalThis.fetch = (async () => new Response('not found', { status: 404 })) as typeof fetch;
        await expect(resolveComponent('nope')).rejects.toThrow(/not found in registry/);
    });
});
