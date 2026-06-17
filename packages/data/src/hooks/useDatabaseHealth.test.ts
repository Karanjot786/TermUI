import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let stateValues: unknown[] = [];
let stateSetters: Array<ReturnType<typeof vi.fn>> = [];
let effectCb: (() => (() => void) | void) | null = null;
let stateCallCount = 0;

vi.mock('@termuijs/jsx', () => ({
    useState: (initial: unknown) => {
        const id = stateCallCount++;
        if (stateValues[id] === undefined) {
            stateValues[id] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
        }
        if (!stateSetters[id]) {
            stateSetters[id] = vi.fn((newVal: unknown) => {
                stateValues[id] = typeof newVal === 'function'
                    ? (newVal as (prev: unknown) => unknown)(stateValues[id])
                    : newVal;
            });
        }
        return [stateValues[id], stateSetters[id]];
    },
    useEffect: (cb: () => (() => void) | void) => {
        effectCb = cb;
    },
    useInterval: vi.fn(),
}));

const mockDatabasePing = vi.fn();

vi.mock('../database.js', () => ({
    database: {
        ping: (...args: unknown[]) => mockDatabasePing(...args),
    },
}));

const flushPromises = () => new Promise<void>(resolve => process.nextTick(resolve));

const { useDatabaseHealth } = await import('./useDatabaseHealth.js');

const MOCK_CONFIG = { type: 'postgres' as const, host: 'localhost', port: 5432 };

describe('useDatabaseHealth', () => {
    beforeEach(() => {
        stateValues = [];
        stateSetters = [];
        stateCallCount = 0;
        effectCb = null;

        vi.useFakeTimers();
        mockDatabasePing.mockReset();
        mockDatabasePing.mockResolvedValue({
            connected: true,
            latencyMs: 3,
            activeConnections: 5,
            maxConnections: 100,
            poolPercent: 5,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('initial state is loading', () => {
        const { data, error, loading } = useDatabaseHealth(MOCK_CONFIG, 5000);

        expect(loading).toBe(true);
        expect(data).toBeNull();
        expect(error).toBeNull();
    });

    it('fetches data and updates state after async resolution', async () => {
        useDatabaseHealth(MOCK_CONFIG, 5000);

        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(stateValues[0]).toEqual({
            connected: true,
            latencyMs: 3,
            activeConnections: 5,
            maxConnections: 100,
            poolPercent: 5,
        });
        expect(stateValues[1]).toBeNull();
        expect(stateValues[2]).toBe(false);
    });

    it('cleans up interval on unmount', () => {
        useDatabaseHealth(MOCK_CONFIG, 5000);

        const cleanup = effectCb ? effectCb() : undefined;

        expect(vi.getTimerCount()).toBeGreaterThan(0);

        if (typeof cleanup === 'function') {
            cleanup();
        }

        expect(vi.getTimerCount()).toBe(0);
    });

    it('sets error when ping fails', async () => {
        mockDatabasePing.mockRejectedValue(new Error('Connection refused'));

        useDatabaseHealth(MOCK_CONFIG, 5000);

        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(stateValues[1]).toBeInstanceOf(Error);
        expect((stateValues[1] as Error).message).toContain('Connection refused');
        expect(stateValues[2]).toBe(false);
    });

    it('polls and updates on interval', async () => {
        useDatabaseHealth(MOCK_CONFIG, 5000);

        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(mockDatabasePing).toHaveBeenCalledTimes(1);

        mockDatabasePing.mockResolvedValue({
            connected: true,
            latencyMs: 5,
            activeConnections: 10,
            maxConnections: 100,
            poolPercent: 10,
        });

        vi.advanceTimersByTime(5000);
        await flushPromises();

        expect(mockDatabasePing).toHaveBeenCalledTimes(2);
    });
});
