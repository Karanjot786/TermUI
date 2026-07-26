import { describe, it, expect, vi } from 'vitest';
import { SWRCacheStore } from './swr-cache.js';

describe('SWRCacheStore', () => {
    it('caches data and returns cached data on subsequent calls when fresh', async () => {
        const cache = new SWRCacheStore({ ttl: 5000 });
        const fetcher = vi.fn(async () => ({ value: 'hello' }));

        const res1 = await cache.fetch('api/data', fetcher);
        expect(res1).toEqual({ value: 'hello' });
        expect(fetcher).toHaveBeenCalledTimes(1);

        const res2 = await cache.fetch('api/data', fetcher);
        expect(res2).toEqual({ value: 'hello' });
        expect(fetcher).toHaveBeenCalledTimes(1); // Not called again
    });

    it('returns stale data immediately while revalidating asynchronously in background', async () => {
        const cache = new SWRCacheStore({ ttl: 50 });
        let callCount = 0;
        const fetcher = vi.fn(async () => {
            callCount++;
            return { count: callCount };
        });

        // 1. Initial fetch
        const first = await cache.fetch('api/count', fetcher);
        expect(first).toEqual({ count: 1 });

        // Wait for TTL to expire
        await new Promise((r) => setTimeout(r, 60));

        // 2. Second fetch returns stale data (count: 1) instantly while triggering revalidation
        const stale = await cache.fetch('api/count', fetcher);
        expect(stale).toEqual({ count: 1 });

        // Wait for background revalidation to finish
        await new Promise((r) => setTimeout(r, 20));

        // 3. Third fetch gets freshly revalidated data (count: 2)
        const updated = await cache.fetch('api/count', fetcher);
        expect(updated).toEqual({ count: 2 });
    });

    it('deduplicates in-flight fetch requests within dedupingInterval', async () => {
        const cache = new SWRCacheStore({ dedupingInterval: 1000 });
        const fetcher = vi.fn(async () => {
            await new Promise((r) => setTimeout(r, 20));
            return 'data';
        });

        const [p1, p2] = await Promise.all([
            cache.fetch('api/shared', fetcher),
            cache.fetch('api/shared', fetcher),
        ]);

        expect(p1).toBe('data');
        expect(p2).toBe('data');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('invalidates cache entries by tag', async () => {
        const cache = new SWRCacheStore({ ttl: 10000 });
        const fetcher1 = vi.fn(async () => 'metrics-1');
        const fetcher2 = vi.fn(async () => 'logs-1');

        await cache.fetch('api/metrics', fetcher1, { tags: ['system', 'metrics'] });
        await cache.fetch('api/logs', fetcher2, { tags: ['system', 'logs'] });

        expect(cache.size).toBe(2);

        // Invalidate metrics tag
        cache.invalidateTags(['metrics']);

        expect(cache.get('api/metrics')).toBeUndefined();
        expect(cache.get('api/logs')).toBe('logs-1');
    });

    it('evicts least recently used entry when maxSize is exceeded', async () => {
        const cache = new SWRCacheStore({ maxSize: 2 });
        cache.set('key1', 'val1');
        cache.set('key2', 'val2');

        // Access key1 to promote it
        cache.get('key1');

        // Add key3 -> key2 (least recently used) should be evicted
        cache.set('key3', 'val3');

        expect(cache.get('key1')).toBe('val1');
        expect(cache.get('key2')).toBeUndefined();
        expect(cache.get('key3')).toBe('val3');
    });
});
