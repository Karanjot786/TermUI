// ─────────────────────────────────────────────────────
// @termuijs/data — Response Cache
// ─────────────────────────────────────────────────────

export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    staleTime: number;
}

const cacheStore = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<any>>(); // any: fetch promises resolve to heterogeneous shapes per endpoint

/** Maximum number of entries before the LRU evictor kicks in */
let maxSize = 100;

/**
 * Set the maximum cache size. When the cache exceeds this limit,
 * the least recently used entry is evicted on the next write.
 */
export function setCacheMaxSize(size: number): void {
    maxSize = size;
}

/**
 * Get a cache entry by key (URL).
 * On access the entry is promoted to most recently used.
 */
export function getCache<T = any>(key: string): CacheEntry<T> | undefined {
    const entry = cacheStore.get(key);
    if (entry) {
        // Move entry to end (most recently used)
        cacheStore.delete(key);
        cacheStore.set(key, entry);
    }
    return entry as CacheEntry<T> | undefined;
}

/**
 * Set a cache entry. If the key already exists it is promoted
 * to most recently used. If the cache exceeds maxSize the least
 * recently used entry is evicted.
 */
export function setCache<T = any>(key: string, data: T, staleTime: number): void {
    if (cacheStore.has(key)) {
        cacheStore.delete(key);
    }
    cacheStore.set(key, {
        data,
        timestamp: Date.now(),
        staleTime,
    });
    // Evict least-recently-used entries (first in insertion order) until within limit.
    // while, not if: converges when setCacheMaxSize() shrinks the limit below current size.
    while (cacheStore.size > maxSize) {
        const oldestKey = cacheStore.keys().next().value;
        if (oldestKey === undefined) break;
        cacheStore.delete(oldestKey);
    }
}

/**
 * Check if a cache entry exists and is still fresh.
 * Also promotes the entry to most recently used.
 */
export function isFresh(key: string): boolean {
    const entry = getCache(key);
    if (!entry) return false;
    return (Date.now() - entry.timestamp) < entry.staleTime;
}

/**
 * Invalidate a specific cache entry.
 * Forces the next useFetch call for this key to refetch.
 */
export function invalidate(key: string): void {
    cacheStore.delete(key);
    inFlight.delete(key);
}

/**
 * Clear all cache entries.
 */
export function clearCache(): void {
    cacheStore.clear();
    inFlight.clear();
}

/**
 * Share an in-flight fetch promise for identical URLs.
 * Prevents multiple duplicate network requests for the same URL.
 */
export function fetchShared<T>(url: string, fetcher: () => Promise<T>): Promise<T> {
    if (inFlight.has(url)) {
        return inFlight.get(url)!;
    }
    const promise = fetcher().finally(() => {
        inFlight.delete(url);
    });
    inFlight.set(url, promise);
    return promise;
}
