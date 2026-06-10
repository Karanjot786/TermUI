// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for lazy component loader
// ─────────────────────────────────────────────────────

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { lazy } from './lazy.js';
import { setRequestRender } from './hooks.js';

describe('lazy component loader', () => {
    beforeEach(() => {
        setRequestRender(null);
    });

    it('should throw the loading promise when uninitialized', async () => {
        const loader = vi.fn().mockImplementation(() => {
            return new Promise(() => {});
        });

        const LazyComp = lazy(loader);

        let thrown: any = null;
        try {
            LazyComp({});
        } catch (err) {
            thrown = err;
        }

        expect(loader).toHaveBeenCalledTimes(1);
        expect(thrown).toBeInstanceOf(Promise);

        // Calling while pending should throw the same promise and not call loader again
        let thrown2: any = null;
        try {
            LazyComp({});
        } catch (err) {
            thrown2 = err;
        }

        expect(loader).toHaveBeenCalledTimes(1);
        expect(thrown2).toBe(thrown);
    });

    it('should render the component on successful resolution and trigger render request', async () => {
        const renderRequestSpy = vi.fn();
        setRequestRender(renderRequestSpy);

        const DummyComp = vi.fn().mockReturnValue({ type: 'dummy', props: {}, children: [] });
        const loader = vi.fn().mockResolvedValue({ default: DummyComp });

        const LazyComp = lazy(loader);

        // First render pass triggers the loader and throws the promise
        let firstPromise: any;
        try {
            LazyComp({ foo: 'bar' });
        } catch (p) {
            firstPromise = p;
        }

        expect(firstPromise).toBeInstanceOf(Promise);

        // Wait for the loader to resolve
        await firstPromise;

        expect(renderRequestSpy).toHaveBeenCalledTimes(1);

        // Second render pass returns the resolved component result
        const result = LazyComp({ foo: 'bar' });
        expect(DummyComp).toHaveBeenCalledWith({ foo: 'bar' });
        expect(result).toEqual({ type: 'dummy', props: {}, children: [] });
    });

    it('should throw the error when loader rejects and call render request', async () => {
        const renderRequestSpy = vi.fn();
        setRequestRender(renderRequestSpy);

        const loaderError = new Error('Failed to load component');
        const loader = vi.fn().mockRejectedValue(loaderError);

        const LazyComp = lazy(loader);

        let firstPromise: any;
        try {
            LazyComp({});
        } catch (p) {
            firstPromise = p;
        }

        expect(firstPromise).toBeInstanceOf(Promise);

        // Wait for loader rejection
        try {
            await firstPromise;
        } catch (e) {
            // Rejection is expected
        }

        expect(renderRequestSpy).toHaveBeenCalledTimes(1);

        // Subsequent render passes should throw the rejection error
        let thrownError: any;
        try {
            LazyComp({});
        } catch (err) {
            thrownError = err;
        }

        expect(thrownError).toBe(loaderError);
    });
});
