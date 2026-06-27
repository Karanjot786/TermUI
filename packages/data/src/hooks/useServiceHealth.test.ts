import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let stateValues: any[] = [];
let stateCallCount = 0;
let effectCb: (() => (() => void) | void) | null = null;

vi.mock('@termuijs/jsx', () => ({
    useState: (initial: any) => {
        const id = stateCallCount++;
        if (stateValues[id] === undefined) {
            stateValues[id] = typeof initial === 'function' ? initial() : initial;
        }
        const setter = vi.fn((newVal: any) => {
            stateValues[id] = typeof newVal === 'function' ? newVal(stateValues[id]) : newVal;
        });
        return [stateValues[id], setter];
    },
    useEffect: (cb: () => (() => void) | void) => {
        effectCb = cb;
    },
    useInterval: vi.fn(),
}));

const mockServicesList = vi.fn();

vi.mock('../services.js', () => ({
    services: {
        list: (...args: any[]) => mockServicesList(...args),
    },
}));

const { useServiceHealth } = await import('./useServiceHealth.js');

describe('useServiceHealth', () => {
    beforeEach(() => {
        stateValues = [];
        stateCallCount = 0;
        effectCb = null;
        vi.useFakeTimers();
        mockServicesList.mockReturnValue([
            { name: 'nginx', active: true, status: 'running', uptime: '3d', uptimeSeconds: 259200, restarts: 0, cpu: 2.5, mem: 3.1, pid: 1234, description: 'nginx web server' },
        ]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('returns data from services.list on mount', () => {
        const { data, error, loading } = useServiceHealth(['nginx'], 5000);

        expect(data).toHaveLength(1);
        expect(data[0].name).toBe('nginx');
        expect(data[0].active).toBe(true);
        expect(error).toBeNull();
        expect(loading).toBe(false);
    });

    it('polls and updates data via setInterval', () => {
        useServiceHealth(['nginx'], 5000);

        // Execute the effect to start the interval
        if (effectCb) {
            effectCb();
        }

        // Change return value to simulate updated service status
        const updatedData = [
            { name: 'nginx', active: false, status: 'stopped', uptime: '0s', uptimeSeconds: 0, restarts: 1, cpu: 0, mem: 0, pid: 0, description: 'nginx web server' },
        ];
        mockServicesList.mockReturnValue(updatedData);

        // Advance time to trigger the interval
        vi.advanceTimersByTime(5000);

        // The data should have been updated from the polling
        expect(mockServicesList).toHaveBeenCalledWith(['nginx']);
    });

    it('cleans up interval on unmount', () => {
        useServiceHealth(['nginx'], 5000);

        const cleanup = effectCb ? effectCb() : undefined;

        expect(vi.getTimerCount()).toBeGreaterThan(0);

        if (typeof cleanup === 'function') {
            cleanup();
        }

        expect(vi.getTimerCount()).toBe(0);
    });
});
