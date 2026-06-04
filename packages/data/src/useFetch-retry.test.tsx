/** @jsxImportSource @termuijs/jsx */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@termuijs/testing';
import { useFetch, type UseFetchOptions, type UseFetchResult } from './hooks.js';

let hookResult: UseFetchResult<unknown> | null = null;

function response(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

function TestComponent({
    url,
    options,
}: {
    url: string;
    options?: UseFetchOptions;
}) {
    hookResult = useFetch<unknown>(url, options);
    return null;
}

async function settle(): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
}

describe('useFetch retry behavior', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        hookResult = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        hookResult = null;
    });

    it('retries the configured number of times', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('request failed'));

        render(<TestComponent url="https://example.com/retry-count" options={{ retry: 2, retryDelay: 100 }} />);

        expect(fetchSpy).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(100);
        await settle();
        expect(fetchSpy).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(200);
        await settle();

        expect(fetchSpy).toHaveBeenCalledTimes(3);
        expect(hookResult?.loading).toBe(false);
        expect(hookResult?.data).toBeNull();
        expect(hookResult?.error).toBeInstanceOf(Error);
    });

    it('succeeds when a retry resolves', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        fetchSpy
            .mockRejectedValueOnce(new Error('request failed'))
            .mockResolvedValueOnce(response({ status: 'ok' }));

        render(<TestComponent url="https://example.com/retry-success" options={{ retry: 1, retryDelay: 100 }} />);

        expect(fetchSpy).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(100);
        await settle();

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(hookResult?.loading).toBe(false);
        expect(hookResult?.data).toEqual({ status: 'ok' });
        expect(hookResult?.error).toBeNull();
    });

    it('sets error after retries are exhausted', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('request failed'));

        render(<TestComponent url="https://example.com/retry-exhausted" options={{ retry: 1, retryDelay: 50 }} />);

        expect(fetchSpy).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(50);
        await settle();

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(hookResult?.loading).toBe(false);
        expect(hookResult?.data).toBeNull();
        expect(hookResult?.error).toBeInstanceOf(Error);
    });

    it('default makes a single attempt', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('request failed'));

        render(<TestComponent url="https://example.com/default-attempt" />);

        expect(fetchSpy).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1000);
        await settle();

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(hookResult?.loading).toBe(false);
        expect(hookResult?.data).toBeNull();
        expect(hookResult?.error).toBeInstanceOf(Error);
    });

    it('clears pending timers on unmount', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('request failed'));
        const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

        const { unmount } = render(
            <TestComponent url="https://example.com/unmount-cleanup" options={{ retry: 2, retryDelay: 100 }} />,
        );

        expect(fetchSpy).toHaveBeenCalledTimes(1);

        await settle();

        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1000);
        await settle();

        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
});