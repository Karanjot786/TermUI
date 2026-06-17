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

const mockDockerList = vi.fn();

vi.mock('../docker.js', () => ({
    docker: {
        list: (...args: any[]) => mockDockerList(...args),
    },
}));

const { useDocker } = await import('./useDocker.js');

const MOCK_CONTAINERS = [
    { id: 'abc123', name: 'api', image: 'node:20', status: 'Up 2 hours', state: 'running', cpu: 2.1, memPercent: 24.5, memUsed: 125829120, memLimit: 536870912, netRx: 1024, netTx: 512, pids: 12 },
    { id: 'def456', name: 'redis', image: 'redis:7', status: 'Exited (0)', state: 'exited', cpu: 0, memPercent: 0, memUsed: 0, memLimit: 0, netRx: 0, netTx: 0, pids: 0 },
];

describe('useDocker', () => {
    beforeEach(() => {
        stateValues = [];
        stateCallCount = 0;
        effectCb = null;
        vi.useFakeTimers();
        mockDockerList.mockReset();
        mockDockerList.mockReturnValue(MOCK_CONTAINERS);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('returns data from docker.list after effect runs', () => {
        useDocker(5000);

        if (effectCb) {
            effectCb();
        }

        expect(stateValues[0]).toHaveLength(2);
        expect(stateValues[0][0].name).toBe('api');
        expect(stateValues[0][0].cpu).toBe(2.1);
        expect(stateValues[1]).toBeNull();
        expect(stateValues[2]).toBe(false);
    });

    it('polls and updates data via setInterval', () => {
        useDocker(5000);

        if (effectCb) {
            effectCb();
        }

        const updatedData = [
            { id: 'abc123', name: 'api', image: 'node:20', status: 'Up 3 hours', state: 'running', cpu: 3.2, memPercent: 30.1, memUsed: 150000000, memLimit: 536870912, netRx: 2048, netTx: 1024, pids: 14 },
        ];
        mockDockerList.mockReturnValue(updatedData);

        vi.advanceTimersByTime(5000);

        // Called once from effect + once from interval = 2 total
        expect(mockDockerList).toHaveBeenCalledTimes(2);
    });

    it('cleans up interval on unmount', () => {
        useDocker(5000);

        const cleanup = effectCb ? effectCb() : undefined;

        expect(vi.getTimerCount()).toBeGreaterThan(0);

        if (typeof cleanup === 'function') {
            cleanup();
        }

        expect(vi.getTimerCount()).toBe(0);
    });

    it('sets error when docker.list throws', () => {
        mockDockerList.mockImplementation(() => { throw new Error('Docker not available'); });

        const { data, loading, error: initialError } = useDocker(5000);

        // Initial state is empty, loading, no error
        expect(data).toEqual([]);
        expect(loading).toBe(true);
        expect(initialError).toBeNull();

        // Trigger the effect which calls update() and catches the error
        if (effectCb) {
            effectCb();
        }

        expect(stateValues[1]).toBeInstanceOf(Error);
        expect((stateValues[1] as Error).message).toContain('Docker not available');
    });
});
