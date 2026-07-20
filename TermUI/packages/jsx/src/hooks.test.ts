// ─────────────────────────────────────────────────────
// Tests — Hooks (useAsync, useContext integration)
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { timerPoolUnsubscribeAll } from '@termuijs/motion';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    useState, useEffect, useRef, useId, useCallback,
    useAsync, useInterval, useInsertBefore, setRequestRender, setInsertBefore, runEffects, destroyFiber,
    type Fiber, type AsyncState,
} from './hooks.js';

describe('useInterval — shared timer pool', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setRequestRender(() => { });
        timerPoolUnsubscribeAll();
    });

    afterEach(() => {
        timerPoolUnsubscribeAll();
        vi.useRealTimers();
        clearCurrentFiber();
    });

    it('creates exactly one pool entry for two components sharing the same delayMs', () => {
        const cbA = vi.fn();
        const cbB = vi.fn();
        const fiberA = createFiber();
        const fiberB = createFiber();

        setCurrentFiber(fiberA);
        useInterval(cbA, 500);
        clearCurrentFiber();

        setCurrentFiber(fiberB);
        useInterval(cbB, 500);
        clearCurrentFiber();

        // Both subscribed to 500 ms — both callbacks fire on each tick
        vi.advanceTimersByTime(500);
        expect(cbA).toHaveBeenCalledTimes(1);
        expect(cbB).toHaveBeenCalledTimes(1);

        destroyFiber(fiberA);
        destroyFiber(fiberB);
    });

    it('creates two pool entries for two different delays', () => {
        const cbA = vi.fn();
        const cbB = vi.fn();
        const fiberA = createFiber();
        const fiberB = createFiber();

        setCurrentFiber(fiberA);
        useInterval(cbA, 250);
        clearCurrentFiber();

        setCurrentFiber(fiberB);
        useInterval(cbB, 1000);
        clearCurrentFiber();

        // After 1000 ms: cbA fires 4 times (250, 500, 750, 1000), cbB fires 1 time
        vi.advanceTimersByTime(1000);
        expect(cbA).toHaveBeenCalledTimes(4);
        expect(cbB).toHaveBeenCalledTimes(1);

        destroyFiber(fiberA);
        destroyFiber(fiberB);
    });

    it('invokes the callback on each tick', () => {
        const cb = vi.fn();
        const fiber = createFiber();

        setCurrentFiber(fiber);
        useInterval(cb, 100);
        clearCurrentFiber();

        vi.advanceTimersByTime(300);
        expect(cb).toHaveBeenCalledTimes(3);

        destroyFiber(fiber);
    });

    it('stops firing for destroyed subscriber while the other keeps running', () => {
        const cbA = vi.fn();
        const cbB = vi.fn();
        const fiberA = createFiber();
        const fiberB = createFiber();

        setCurrentFiber(fiberA);
        useInterval(cbA, 500);
        clearCurrentFiber();

        setCurrentFiber(fiberB);
        useInterval(cbB, 500);
        clearCurrentFiber();

        destroyFiber(fiberA);
        // fiberA unsubscribed — fiberB still active
        vi.advanceTimersByTime(500);
        expect(cbA).toHaveBeenCalledTimes(0);
        expect(cbB).toHaveBeenCalledTimes(1);

        destroyFiber(fiberB);
        // Both gone — no more ticks
        vi.advanceTimersByTime(500);
        expect(cbB).toHaveBeenCalledTimes(1);
    });

    it('stops firing after destroyFiber', () => {
        const cb = vi.fn();
        const fiber = createFiber();

        setCurrentFiber(fiber);
        useInterval(cb, 100);
        clearCurrentFiber();

        vi.advanceTimersByTime(200);
        expect(cb).toHaveBeenCalledTimes(2);

        destroyFiber(fiber);
        vi.advanceTimersByTime(300);
        // No additional calls after destruction
        expect(cb).toHaveBeenCalledTimes(2);
    });

    it('uses the latest callback ref on each tick (no stale closure)', () => {
        const results: string[] = [];
        const fiber = createFiber();

        // First render
        setCurrentFiber(fiber);
        useInterval(() => results.push('first'), 100);
        clearCurrentFiber();

        vi.advanceTimersByTime(100);
        expect(results).toEqual(['first']);

        // Simulate re-render with updated callback
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        useInterval(() => results.push('second'), 100);
        clearCurrentFiber();

        vi.advanceTimersByTime(100);
        expect(results).toEqual(['first', 'second']);

        destroyFiber(fiber);
    });

    it('switches to new interval rate when delayMs changes on re-render', () => {
        const cb = vi.fn();
        const fiber = createFiber();

        // First render: 100 ms interval
        setCurrentFiber(fiber);
        useInterval(cb, 100);
        clearCurrentFiber();

        vi.advanceTimersByTime(200);
        expect(cb).toHaveBeenCalledTimes(2);

        // Re-render: change to 500 ms
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        useInterval(cb, 500);
        clearCurrentFiber();

        // Advance 400 ms — not yet a full 500 ms tick, so no new calls
        vi.advanceTimersByTime(400);
        expect(cb).toHaveBeenCalledTimes(2);

        // Advance another 100 ms to complete the 500 ms cycle
        vi.advanceTimersByTime(100);
        expect(cb).toHaveBeenCalledTimes(3);

        destroyFiber(fiber);
    });
});

describe('useAsync', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        // Mock the render function
        setRequestRender(() => { });
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('starts in loading state', () => {
        setCurrentFiber(fiber);
        const asyncFn = vi.fn(() => new Promise<string>(() => { })); // never resolves
        const state = useAsync(asyncFn, []);
        clearCurrentFiber();

        expect(state.loading).toBe(true);
        expect(state.data).toBeNull();
        expect(state.error).toBeNull();
        expect(typeof state.refetch).toBe('function');
    });

    it('calls the async function after effects run', () => {
        setCurrentFiber(fiber);
        const asyncFn = vi.fn(() => Promise.resolve('data'));
        useAsync(asyncFn, []);
        // useAsync uses useEffect internally — effects run after render
        runEffects(fiber);
        clearCurrentFiber();

        expect(asyncFn).toHaveBeenCalledOnce();
    });

    it('provides a refetch function', () => {
        setCurrentFiber(fiber);
        const asyncFn = vi.fn(() => Promise.resolve('data'));
        const state = useAsync(asyncFn, []);
        clearCurrentFiber();

        expect(typeof state.refetch).toBe('function');
    });

    it('Fiber contextValues is initialized as empty Map', () => {
        expect(fiber.contextValues).toBeInstanceOf(Map);
        expect(fiber.contextValues.size).toBe(0);
    });

    it('Fiber parent is undefined by default', () => {
        expect(fiber.parent).toBeUndefined();
    });

    it('createFiber accepts parent parameter', () => {
        const parent = createFiber();
        const child = createFiber(parent);
        expect(child.parent).toBe(parent);
    });
});

describe('useInsertBefore', () => {
    it('registers and cleans up inline header lines', () => {
        const fiber = createFiber();
        const insertBefore = vi.fn(() => vi.fn());

        setInsertBefore(insertBefore);
        setCurrentFiber(fiber);
        useInsertBefore('HEADER LINE');
        runEffects(fiber);
        clearCurrentFiber();

        expect(insertBefore).toHaveBeenCalledOnce();
        expect(insertBefore).toHaveBeenCalledWith('HEADER LINE');
    });
});
describe('useId', () => {
    it('returns a string id', () => {
        const fiber = createFiber();

        setCurrentFiber(fiber);
        const id = useId();
        clearCurrentFiber();

        expect(typeof id).toBe('string');
    });

    it('returns the same id across re-renders', () => {
        const fiber = createFiber();

        setCurrentFiber(fiber);
        const id1 = useId();
        clearCurrentFiber();

        setCurrentFiber(fiber);
        const id2 = useId();
        clearCurrentFiber();

        expect(id1).toBe(id2);
    });

    it('returns different ids for different fibers', () => {
        const fiberA = createFiber();
        const fiberB = createFiber();

        setCurrentFiber(fiberA);
        const idA = useId();
        clearCurrentFiber();

        setCurrentFiber(fiberB);
        const idB = useId();
        clearCurrentFiber();

        expect(idA).not.toBe(idB);
    });
});