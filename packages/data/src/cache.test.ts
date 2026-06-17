import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getCache,
    setCache,
    isFresh,
    invalidate,
    clearCache,
    fetchShared,
} from './cache.js';

describe('Response Cache Provider', () => {
    beforeEach(() => {
        clearCache();
        vi.useFakeTimers();
        // Setup initial system time
        vi.setSystemTime(1000000);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('setCache and getCache', () => {
        it('stores and retrieves cache entries correctly', () => {
            setCache('key1', { val: 'hello' }, 5000);
            
            const entry = getCache('key1');
            expect(entry).toBeDefined();
            expect(entry?.data).toEqual({ val: 'hello' });
            expect(entry?.staleTime).toBe(5000);
            expect(entry?.timestamp).toBe(1000000);
        });

        it('returns undefined for non-existent keys', () => {
            expect(getCache('non-existent')).toBeUndefined();
        });
    });

    describe('isFresh', () => {
        it('returns true when cache is fresh and false when stale', () => {
            setCache('key1', 'some-data', 1000); // 1s stale time
            
            expect(isFresh('key1')).toBe(true);

            // Advance by 500ms
            vi.advanceTimersByTime(500);
            expect(isFresh('key1')).toBe(true);

            // Advance by another 600ms (total 1100ms)
            vi.advanceTimersByTime(600);
            expect(isFresh('key1')).toBe(false);
        });

        it('returns false for non-existent keys', () => {
            expect(isFresh('non-existent')).toBe(false);
        });
    });

    describe('invalidate', () => {
        it('removes cache entries and invalidates freshness', () => {
            setCache('key1', 'data', 5000);
            expect(getCache('key1')).toBeDefined();
            
            invalidate('key1');
            expect(getCache('key1')).toBeUndefined();
            expect(isFresh('key1')).toBe(false);
        });
    });

    describe('clearCache', () => {
        it('removes all cache entries', () => {
            setCache('key1', 'data1', 5000);
            setCache('key2', 'data2', 5000);
            
            expect(getCache('key1')).toBeDefined();
            expect(getCache('key2')).toBeDefined();
            
            clearCache();
            expect(getCache('key1')).toBeUndefined();
            expect(getCache('key2')).toBeUndefined();
        });
    });

    describe('fetchShared', () => {
        it('deduplicates simultaneous in-flight promises', async () => {
            let callCount = 0;
            const fetcher = async () => {
                callCount++;
                return 'result-data';
            };

            // Call fetchShared simultaneously twice
            const p1 = fetchShared('url-1', fetcher);
            const p2 = fetchShared('url-1', fetcher);

            // Resolve the timers/promises
            vi.runAllTimers();
            const res1 = await p1;
            const res2 = await p2;

            expect(res1).toBe('result-data');
            expect(res2).toBe('result-data');
            expect(callCount).toBe(1); // Deduplicated!
        });

        it('allows subsequent calls after first promise resolves', async () => {
            let callCount = 0;
            const fetcher = async () => {
                callCount++;
                return 'result-data';
            };

            const p1 = fetchShared('url-2', fetcher);
            vi.runAllTimers();
            await p1;

            expect(callCount).toBe(1);

            // Subsequent fetch should not be sharing since inFlight is cleared
            const p2 = fetchShared('url-2', fetcher);
            vi.runAllTimers();
            await p2;

            expect(callCount).toBe(2); // Called again!
        });
    });
});
