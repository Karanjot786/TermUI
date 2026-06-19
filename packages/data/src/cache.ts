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

/**
 * Get a cache entry by key (URL).
 */
export function getCache<T = any>(key: string): CacheEntry<T> | undefined {
    return cacheStore.get(key) as CacheEntry<T> | undefined;
}

/**
 * Set a cache entry.
 */
export function setCache<T = any>(key: string, data: T, staleTime: number): void {
    cacheStore.set(key, {
        data,
        timestamp: Date.now(),
        staleTime,
    });
}

/**
 * Check if a cache entry exists and is still fresh.
 */
export function isFresh(key: string): boolean {
    const entry = cacheStore.get(key);
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
