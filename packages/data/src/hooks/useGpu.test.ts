import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as cp from 'node:child_process';

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

const flushPromises = () => new Promise<void>(resolve => process.nextTick(resolve));

vi.mock('node:os', () => ({
    platform: vi.fn(),
}));

vi.mock('node:child_process', () => ({
    execFile: vi.fn(),
}));

const { useGpu } = await import('./useGpu.js');

describe('useGpu', () => {
    beforeEach(() => {
        stateValues = [];
        stateSetters = [];
        stateCallCount = 0;
        effectCb = null;

        vi.useFakeTimers();
        vi.spyOn(os, 'platform').mockReturnValue('linux');

        (cp.execFile as ReturnType<typeof vi.fn>).mockImplementation((file: string, _args: unknown, _opts: unknown, cb: unknown) => {
            if (typeof cb !== 'function') return;
            if (file.includes('nvidia-smi')) {
                cb(null, '72, 4096, 8192\n', '');
                return;
            }
            cb(new Error('Command failed'), '', '');
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('initial state is loading', () => {
        const { data, error, loading } = useGpu(1000);

        expect(loading).toBe(true);
        expect(data).toBeNull();
        expect(error).toBeNull();
    });

    it('fetches data and updates state after async resolution', async () => {
        useGpu(1000);

        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(stateValues[0]).toEqual({
            utilizationPercent: 72,
            vramUsedMb: 4096,
            vramTotalMb: 8192,
        });
        expect(stateValues[1]).toBeNull();
        expect(stateValues[2]).toBe(false);
    });

    it('cleans up interval on unmount', () => {
        useGpu(1000);

        const cleanup = effectCb ? effectCb() : undefined;

        expect(vi.getTimerCount()).toBeGreaterThan(0);

        if (typeof cleanup === 'function') {
            cleanup();
        }

        expect(vi.getTimerCount()).toBe(0);
    });

    it('sets error when GPU metrics cannot be read', async () => {
        vi.spyOn(os, 'platform').mockReturnValue('darwin');
        (cp.execFile as ReturnType<typeof vi.fn>).mockImplementation((_file: string, _args: unknown, _opts: unknown, cb: unknown) => {
            if (typeof cb === 'function') {
                cb(new Error('nvidia-smi not found'), '', '');
            }
        });

        useGpu(1000);

        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(stateValues[1]).toBeInstanceOf(Error);
        expect((stateValues[1] as Error).message).toContain('GPU metrics not available');
        expect(stateValues[2]).toBe(false);
    });
});
