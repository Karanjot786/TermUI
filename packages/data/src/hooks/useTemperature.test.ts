import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as cp from 'node:child_process';
import * as fs from 'node:fs/promises';

let stateValues: any[] = [];
let stateSetters: any[] = [];
let effectCb: (() => (() => void) | void) | null = null;
let stateCallCount = 0;

vi.mock('@termuijs/jsx', () => ({
    useState: (initial: any) => {
        const id = stateCallCount++;
        if (stateValues[id] === undefined) {
            stateValues[id] = typeof initial === 'function' ? initial() : initial;
        }
        if (!stateSetters[id]) {
            stateSetters[id] = vi.fn((newVal) => {
                stateValues[id] = typeof newVal === 'function' ? newVal(stateValues[id]) : newVal;
            });
        }
        return [stateValues[id], stateSetters[id]];
    },
    useEffect: (cb: () => (() => void) | void) => {
        effectCb = cb;
    },
    useInterval: vi.fn(),
}));

const flushPromises = () => new Promise(resolve => process.nextTick(resolve));

vi.mock('node:os', () => ({
    platform: vi.fn(),
}));

vi.mock('node:child_process', () => ({
    execFile: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
    readFile: vi.fn(),
}));

const { useTemperature } = await import('./useTemperature.js');

describe('useTemperature', () => {
    beforeEach(() => {
        stateValues = [];
        stateSetters = [];
        stateCallCount = 0;
        effectCb = null;

        vi.useFakeTimers();
        (os.platform as any).mockReturnValue('linux');

        (fs.readFile as any).mockResolvedValue('45000\n');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('initial state is loading', () => {
        const { data, error, loading } = useTemperature(1000);

        expect(loading).toBe(true);
        expect(data).toBeNull();
        expect(error).toBeNull();
    });

    it('fetches data and updates state on success', async () => {
        useTemperature(1000);

        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(stateValues[0]).toEqual({ celsius: 45, platform: 'linux' });
        expect(stateValues[1]).toBeNull();
        expect(stateValues[2]).toBe(false);
    });

    it('sets error when the platform is not supported', async () => {
        (os.platform as any).mockReturnValue('darwin');

        useTemperature(1000);

        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(stateValues[1]).toBeInstanceOf(Error);
        expect(stateValues[1].message).toContain('not supported on macOS');
        expect(stateValues[2]).toBe(false);
    });

    it('sets error when readFile fails on linux', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('Permission denied'));

        useTemperature(1000);

        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(stateValues[1]).toBeInstanceOf(Error);
        expect(stateValues[1].message).toContain('Permission denied');
        expect(stateValues[2]).toBe(false);
    });

    it('cleans up interval on unmount', () => {
        useTemperature(1000);

        const cleanup = effectCb ? effectCb() : undefined;

        expect(vi.getTimerCount()).toBeGreaterThan(0);

        if (typeof cleanup === 'function') {
            cleanup();
        }

        expect(vi.getTimerCount()).toBe(0);
    });
});
