// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useAsync hook
// ─────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, runEffects, destroyFiber,
} from '../hooks.js';
import { useAsync } from './useAsync.js';

function renderWithFiber<T>(fiber: ReturnType<typeof createFiber>, fn: () => T): T {
    setCurrentFiber(fiber);
    const result = fn();
    clearCurrentFiber();
    runEffects(fiber);
    return result;
}

describe('useAsync', () => {
    beforeEach(() => {
        setRequestRender(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        clearCurrentFiber();
    });

    it('starts loading immediately and resolves data on success', async () => {
        const fiber = createFiber();
        const asyncFn = vi.fn().mockResolvedValue('hello world');

        let res = renderWithFiber(fiber, () => useAsync(asyncFn));
        expect(res.isLoading).toBe(true);
        expect(res.loading).toBe(true);
        expect(res.isIdle).toBe(false);
        expect(res.data).toBeNull();

        await asyncFn();

        res = renderWithFiber(fiber, () => useAsync(asyncFn));
        expect(res.isLoading).toBe(false);
        expect(res.isSuccess).toBe(true);
        expect(res.data).toBe('hello world');
        expect(res.error).toBeNull();

        destroyFiber(fiber);
    });

    it('captures error when async function rejects', async () => {
        const fiber = createFiber();
        const testError = new Error('Network failure');
        const asyncFn = vi.fn().mockRejectedValue(testError);

        let res = renderWithFiber(fiber, () => useAsync(asyncFn));
        expect(res.isLoading).toBe(true);

        try {
            await asyncFn();
        } catch {
            // expected rejection
        }

        res = renderWithFiber(fiber, () => useAsync(asyncFn));
        expect(res.isLoading).toBe(false);
        expect(res.isError).toBe(true);
        expect(res.error).toBe(testError);
        expect(res.data).toBeNull();

        destroyFiber(fiber);
    });

    it('respects immediate: false and starts in isIdle state', async () => {
        const fiber = createFiber();
        const asyncFn = vi.fn().mockResolvedValue(42);

        let res = renderWithFiber(fiber, () => useAsync(asyncFn, { immediate: false }));
        expect(res.isIdle).toBe(true);
        expect(res.isLoading).toBe(false);
        expect(asyncFn).not.toHaveBeenCalled();

        res.execute();

        res = renderWithFiber(fiber, () => useAsync(asyncFn, { immediate: false }));
        expect(res.isLoading).toBe(true);

        await asyncFn();

        res = renderWithFiber(fiber, () => useAsync(asyncFn, { immediate: false }));
        expect(res.isSuccess).toBe(true);
        expect(res.data).toBe(42);

        destroyFiber(fiber);
    });

    it('invokes onSuccess and onError callbacks', async () => {
        const fiber = createFiber();
        const onSuccess = vi.fn();
        const onError = vi.fn();

        const successFn = vi.fn().mockResolvedValue('data');
        renderWithFiber(fiber, () => useAsync(successFn, { onSuccess }));
        await successFn();
        renderWithFiber(fiber, () => useAsync(successFn, { onSuccess }));
        expect(onSuccess).toHaveBeenCalledWith('data');
        destroyFiber(fiber);

        const fiber2 = createFiber();
        const errorObj = new Error('Failed');
        const failFn = vi.fn().mockRejectedValue(errorObj);
        renderWithFiber(fiber2, () => useAsync(failFn, { onError }));
        try { await failFn(); } catch {}
        renderWithFiber(fiber2, () => useAsync(failFn, { onError }));
        expect(onError).toHaveBeenCalledWith(errorObj);
        destroyFiber(fiber2);
    });

    it('reset() returns state back to initial idle state', async () => {
        const fiber = createFiber();
        const asyncFn = vi.fn().mockResolvedValue('result');

        let res = renderWithFiber(fiber, () => useAsync(asyncFn, { initialData: 'initial' }));
        await asyncFn();

        res = renderWithFiber(fiber, () => useAsync(asyncFn, { initialData: 'initial' }));
        expect(res.data).toBe('result');

        res.reset();

        res = renderWithFiber(fiber, () => useAsync(asyncFn, { initialData: 'initial' }));
        expect(res.isIdle).toBe(true);
        expect(res.data).toBe('initial');
        expect(res.error).toBeNull();

        destroyFiber(fiber);
    });

    it('supports refetch() as alias to execute()', async () => {
        const fiber = createFiber();
        let count = 0;
        const asyncFn = vi.fn().mockImplementation(async () => ++count);

        let res = renderWithFiber(fiber, () => useAsync(asyncFn, { immediate: false }));
        expect(res.data).toBeNull();

        await res.execute();
        res = renderWithFiber(fiber, () => useAsync(asyncFn, { immediate: false }));
        expect(res.data).toBe(1);

        await res.refetch();
        res = renderWithFiber(fiber, () => useAsync(asyncFn, { immediate: false }));
        expect(res.data).toBe(2);

        destroyFiber(fiber);
    });
});
