/** @jsxImportSource @termuijs/jsx */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@termuijs/testing';
import { useInfiniteQuery } from './hooks.js';

// ─── helpers ───────────────────────────────────────────

/** Flush all resolved promises (microtask queue). */
const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// ─── tests ─────────────────────────────────────────────

describe('useInfiniteQuery', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('loads the first page on mount', async () => {
        const queryFn = vi.fn().mockResolvedValue({ items: ['a', 'b'], nextPage: 2 });
        const getNextPageParam = vi.fn((last: { items: string[]; nextPage: number | null }) =>
            last.nextPage ?? undefined,
        );

        let result: ReturnType<typeof useInfiniteQuery> | undefined;

        function TestComponent() {
            result = useInfiniteQuery({
                queryFn,
                initialPageParam: 1,
                getNextPageParam,
            });
            return null;
        }

        render(<TestComponent />);

        // Immediately after mount: loading, no pages yet
        expect(result!.loading).toBe(true);
        expect(result!.pages).toHaveLength(0);
        expect(queryFn).toHaveBeenCalledTimes(1);
        expect(queryFn).toHaveBeenCalledWith(1);

        await flush();

        // After promise resolves: first page is stored
        expect(result!.loading).toBe(false);
        expect(result!.error).toBeNull();
        expect(result!.pages).toHaveLength(1);
        expect(result!.pages[0]).toEqual({ items: ['a', 'b'], nextPage: 2 });
    });

    it('fetchNextPage appends a page', async () => {
        type Page = { items: string[]; next: number | null };
        const pages: Page[] = [
            { items: ['a'], next: 2 },
            { items: ['b'], next: null },
        ];

        let call = 0;
        const queryFn = vi.fn(() => Promise.resolve(pages[call++]));
        const getNextPageParam = vi.fn((last: Page) => last.next ?? undefined);

        let result: ReturnType<typeof useInfiniteQuery<Page, number>> | undefined;

        function TestComponent() {
            result = useInfiniteQuery<Page, number>({
                queryFn,
                initialPageParam: 1,
                getNextPageParam,
            });
            return null;
        }

        render(<TestComponent />);
        await flush();

        // First page loaded, hasNextPage should be true
        expect(result!.pages).toHaveLength(1);
        expect(result!.hasNextPage).toBe(true);
        expect(result!.loading).toBe(false);

        // Trigger next page fetch
        result!.fetchNextPage();

        await flush();

        // Second page appended
        expect(result!.pages).toHaveLength(2);
        expect(result!.pages[1]).toEqual({ items: ['b'], next: null });
        expect(queryFn).toHaveBeenCalledTimes(2);
        expect(queryFn).toHaveBeenNthCalledWith(2, 2);
    });

    it('hasNextPage becomes false at the end', async () => {
        type Page = { items: string[]; next: number | null };
        let call = 0;
        const data: Page[] = [
            { items: ['x'], next: 2 },
            { items: ['y'], next: null },
        ];
        const queryFn = vi.fn(() => Promise.resolve(data[call++]));
        const getNextPageParam = vi.fn((last: Page) => last.next ?? undefined);

        let result: ReturnType<typeof useInfiniteQuery<Page, number>> | undefined;

        function TestComponent() {
            result = useInfiniteQuery<Page, number>({
                queryFn,
                initialPageParam: 1,
                getNextPageParam,
            });
            return null;
        }

        render(<TestComponent />);
        await flush();

        expect(result!.hasNextPage).toBe(true);

        result!.fetchNextPage();
        await flush();

        // After the last page, hasNextPage must be false
        expect(result!.hasNextPage).toBe(false);
        expect(result!.pages).toHaveLength(2);

        // fetchNextPage is now a no-op
        const prevCallCount = queryFn.mock.calls.length;
        result!.fetchNextPage();
        await flush();
        expect(queryFn).toHaveBeenCalledTimes(prevCallCount); // no extra call
    });

    it('surfaces queryFn errors', async () => {
        const boom = new Error('network failure');
        const queryFn = vi.fn().mockRejectedValue(boom);
        const getNextPageParam = vi.fn(() => undefined);

        let result: ReturnType<typeof useInfiniteQuery> | undefined;

        function TestComponent() {
            result = useInfiniteQuery({
                queryFn,
                initialPageParam: 0,
                getNextPageParam,
            });
            return null;
        }

        render(<TestComponent />);
        await flush();

        expect(result!.loading).toBe(false);
        expect(result!.error).toBeInstanceOf(Error);
        expect(result!.error!.message).toBe('network failure');
        expect(result!.pages).toHaveLength(0);
    });

    it('cleans up without setState after unmount', async () => {
        // queryFn returns a promise we can resolve manually
        let resolve!: (value: string[]) => void;
        const pendingPromise = new Promise<string[]>(res => { resolve = res; });
        const queryFn = vi.fn().mockReturnValue(pendingPromise);
        const getNextPageParam = vi.fn(() => undefined);

        let result: ReturnType<typeof useInfiniteQuery> | undefined;

        function TestComponent() {
            result = useInfiniteQuery({
                queryFn,
                initialPageParam: 1,
                getNextPageParam,
            });
            return null;
        }

        const { unmount } = render(<TestComponent />);

        // Component is mounted, query is in flight
        expect(result!.loading).toBe(true);

        // Unmount before the query resolves
        unmount();

        // Capture state reference immediately after unmount
        const pagesAfterUnmount = result!.pages;

        // Now resolve the pending query — this should NOT update state
        resolve(['orphan-data']);
        await flush();

        // pages must remain unchanged (AbortController guard prevented setState)
        expect(result!.pages).toBe(pagesAfterUnmount);
        expect(result!.pages).toHaveLength(0);
    });

    it('discards in-flight fetches when queryFn changes', async () => {
        // Two manually-controlled promises
        let resolveA!: (value: string[]) => void;
        const promiseA = new Promise<string[]>(res => { resolveA = res; });
        const queryFnA = vi.fn(() => promiseA);

        let resolveB!: (value: string[]) => void;
        const promiseB = new Promise<string[]>(res => { resolveB = res; });
        const queryFnB = vi.fn(() => promiseB);

        const getNextPageParam = vi.fn(() => undefined);

        let result: ReturnType<typeof useInfiniteQuery<string[], number>> | undefined;
        let currentQueryFn = queryFnA as (p: number) => Promise<string[]>;

        function TestComponent() {
            result = useInfiniteQuery<string[], number>({
                queryFn: currentQueryFn,
                initialPageParam: 1,
                getNextPageParam,
            });
            return null;
        }

        const { rerender } = render(<TestComponent />);

        // queryFnA is in flight
        expect(result!.loading).toBe(true);

        // Switch to queryFnB — effect re-runs, old fetch should be discarded
        currentQueryFn = queryFnB;
        rerender(<TestComponent />);

        // Resolve the old (stale) fetch — must be ignored
        resolveA(['stale-data']);
        await flush();

        // Resolve the new (fresh) fetch
        resolveB(['fresh-data']);
        await flush();

        // Only fresh data should appear; stale data from queryFnA is discarded
        expect(result!.pages).toEqual([['fresh-data']]);
        expect(result!.pages).not.toContainEqual(['stale-data']);
    });

    it('cleans up fetchNextPage after unmount', async () => {
        let resolveA!: (value: string[]) => void;
        const promiseA = new Promise<string[]>(res => { resolveA = res; });

        let resolveB!: (value: string[]) => void;
        const promiseB = new Promise<string[]>(res => { resolveB = res; });

        let call = 0;
        const queryFn = vi.fn(() => {
            return call++ === 0 ? promiseA : promiseB;
        });

        const getNextPageParam = vi.fn((last: string[]) => {
            return last.includes('fresh-data') ? 2 : undefined;
        });

        let result: ReturnType<typeof useInfiniteQuery<string[], number>> | undefined;

        function TestComponent() {
            result = useInfiniteQuery<string[], number>({
                queryFn,
                initialPageParam: 1,
                getNextPageParam,
            });
            return null;
        }

        const { unmount } = render(<TestComponent />);

        // Resolve first page
        resolveA(['fresh-data']);
        await flush();

        expect(result!.pages).toHaveLength(1);
        expect(result!.hasNextPage).toBe(true);

        // Call fetchNextPage, which runs queryFn(2) with promiseB
        result!.fetchNextPage();

        // Unmount before page 2 resolves
        unmount();

        const pagesAfterUnmount = result!.pages;

        // Resolve the pending fetchNextPage query
        resolveB(['second-data']);
        await flush();

        // Pages should not update since it unmounted
        expect(result!.pages).toBe(pagesAfterUnmount);
        expect(result!.pages).toHaveLength(1);
    });

    it('guards against rapid synchronous double-calls of fetchNextPage', async () => {
        let resolveA!: (value: string[]) => void;
        const promiseA = new Promise<string[]>(res => { resolveA = res; });

        let resolveB!: (value: string[]) => void;
        const promiseB = new Promise<string[]>(res => { resolveB = res; });

        let call = 0;
        const queryFn = vi.fn(() => {
            return call++ === 0 ? promiseA : promiseB;
        });

        const getNextPageParam = vi.fn((last: string[]) => {
            return last.includes('first-data') ? 2 : undefined;
        });

        let result: ReturnType<typeof useInfiniteQuery<string[], number>> | undefined;

        function TestComponent() {
            result = useInfiniteQuery<string[], number>({
                queryFn,
                initialPageParam: 1,
                getNextPageParam,
            });
            return null;
        }

        render(<TestComponent />);

        // Resolve first page
        resolveA(['first-data']);
        await flush();

        expect(result!.pages).toHaveLength(1);
        expect(result!.hasNextPage).toBe(true);

        // Synchronously call fetchNextPage twice
        result!.fetchNextPage();
        result!.fetchNextPage();

        // queryFn should only be called once for page 2 (total calls = 2, first page + second page)
        expect(queryFn).toHaveBeenCalledTimes(2);

        // Resolve second page
        resolveB(['second-data']);
        await flush();

        expect(result!.pages).toHaveLength(2);
    });
});
