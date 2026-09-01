// ─────────────────────────────────────────────────────
// @termuijs/data — SWR Cache Store
// ─────────────────────────────────────────────────────

export interface SWRCacheOptions {
    /** Time-to-live in milliseconds before data is considered stale. Default 5000ms. */
    ttl?: number;
    /** Deduplication interval in ms during which in-flight requests are shared. Default 2000ms. */
    dedupingInterval?: number;
    /** Maximum cache size limit. Default 100 entries. */
    maxSize?: number;
}

export interface SWRCacheEntry<T = any> {
    data: T;
    timestamp: number;
    ttl: number;
    tags: string[];
}

export interface SWRFetchOptions {
    tags?: string[];
    ttl?: number;
    dedupingInterval?: number;
}

export class SWRCacheStore {
    private _cache = new Map<string, SWRCacheEntry>();
    private _inFlight = new Map<string, { promise: Promise<any>; timestamp: number }>();
    private _ttl: number;
    private _dedupingInterval: number;
    private _maxSize: number;

    constructor(options: SWRCacheOptions = {}) {
        this._ttl = options.ttl ?? 5000;
        this._dedupingInterval = options.dedupingInterval ?? 2000;
        this._maxSize = options.maxSize ?? 100;
    }

    get<T = any>(key: string): T | undefined {
        const entry = this._cache.get(key);
        if (!entry) return undefined;
        // Promote key in LRU
        this._cache.delete(key);
        this._cache.set(key, entry);
        return entry.data as T;
    }

    getEntry<T = any>(key: string): SWRCacheEntry<T> | undefined {
        return this._cache.get(key) as SWRCacheEntry<T> | undefined;
    }

    set<T = any>(key: string, data: T, options?: { tags?: string[]; ttl?: number }): void {
        if (this._cache.has(key)) {
            this._cache.delete(key);
        }

        const entry: SWRCacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: options?.ttl ?? this._ttl,
            tags: options?.tags ?? [],
        };

        this._cache.set(key, entry);

        while (this._cache.size > this._maxSize) {
            const oldest = this._cache.keys().next().value;
            if (oldest !== undefined) {
                this._cache.delete(oldest);
            } else {
                break;
            }
        }
    }

    async fetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: SWRFetchOptions
    ): Promise<T> {
        const entry = this._cache.get(key);
        const now = Date.now();
        const dedupInterval = options?.dedupingInterval ?? this._dedupingInterval;
        const entryTtl = options?.ttl ?? (entry?.ttl ?? this._ttl);

        // Check if there is an in-flight request within dedupingInterval
        const activeInFlight = this._inFlight.get(key);
        if (activeInFlight && (now - activeInFlight.timestamp) < dedupInterval) {
            if (entry) return entry.data as T;
            return activeInFlight.promise;
        }

        // If fresh data exists in cache, return immediately
        const isStale = !entry || (now - entry.timestamp) >= entryTtl;

        if (!isStale && entry) {
            return entry.data as T;
        }

        // If stale cached data exists, kick off async revalidation in background
        if (entry && isStale) {
            this._revalidate(key, fetcher, options);
            return entry.data as T;
        }

        // No cached data exists: wait for fetcher
        return this._revalidate(key, fetcher, options);
    }

    private _revalidate<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: SWRFetchOptions
    ): Promise<T> {
        const promise = (async () => {
            try {
                const data = await fetcher();
                this.set(key, data, { tags: options?.tags, ttl: options?.ttl });
                return data;
            } finally {
                this._inFlight.delete(key);
            }
        })();

        this._inFlight.set(key, { promise, timestamp: Date.now() });
        return promise;
    }

    invalidateTags(tags: string[]): void {
        const tagSet = new Set(tags);
        for (const [key, entry] of this._cache.entries()) {
            if (entry.tags.some((t) => tagSet.has(t))) {
                this._cache.delete(key);
                this._inFlight.delete(key);
            }
        }
    }

    invalidate(key: string): void {
        this._cache.delete(key);
        this._inFlight.delete(key);
    }

    clear(): void {
        this._cache.clear();
        this._inFlight.clear();
    }

    get size(): number {
        return this._cache.size;
    }
}
