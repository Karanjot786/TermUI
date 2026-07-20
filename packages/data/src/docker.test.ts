import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecFileSync = vi.fn();

vi.mock('node:child_process', () => ({
    execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

const { docker } = await import('./docker.js');

const MOCK_PS_JSON = [
    JSON.stringify({
        ID: 'abc123def456ghi789jkl',
        Names: '/api-server',
        Image: 'node:20',
        Status: 'Up 2 hours',
        State: 'running',
        Ports: '0.0.0.0:3000->3000/tcp',
        CreatedAt: '2026-06-10 08:00:00',
        RunningFor: '2 hours ago',
    }),
    JSON.stringify({
        ID: 'xyz789abc123def456ghi',
        Names: '/redis-cache',
        Image: 'redis:7',
        Status: 'Exited (0) 5 hours ago',
        State: 'exited',
        Ports: '',
        CreatedAt: '2026-06-09 10:00:00',
        RunningFor: '5 hours ago',
    }),
].join('\n');

const MOCK_STATS_JSON = JSON.stringify({
    CPU: '2.10%',
    CPUPerc: '2.10%',
    MemUsage: '120MiB / 512MiB',
    MemPerc: '24.57%',
    NetIO: '1.02kB / 512B',
    BlockIO: '0B / 0B',
    PIDs: '12',
    Name: 'api-server',
    ID: 'abc123def456ghi789jkl',
    Container: 'abc123def456',
});

describe('docker provider', () => {
    beforeEach(() => {
        mockExecFileSync.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns empty array when docker CLI is unavailable', () => {
        mockExecFileSync.mockImplementation(() => { throw new Error('docker not found'); });

        const result = docker.list();
        expect(result).toEqual([]);
    });

    it('parses docker ps output for all containers', () => {
        mockExecFileSync.mockReturnValue(MOCK_PS_JSON);

        const result = docker.list();

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('abc123def456');
        expect(result[0].name).toBe('api-server');
        expect(result[0].image).toBe('node:20');
        expect(result[0].state).toBe('running');
        expect(result[1].name).toBe('redis-cache');
        expect(result[1].state).toBe('exited');
    });

    it('enriches running containers with stats', () => {
        mockExecFileSync
            .mockImplementationOnce(() => MOCK_PS_JSON)
            .mockImplementationOnce(() => MOCK_STATS_JSON);

        const result = docker.list();

        const api = result.find(c => c.name === 'api-server')!;
        expect(api).toBeDefined();
        expect(api.cpu).toBe(2.1);
        expect(api.memPercent).toBe(24.57);
        expect(api.memUsed).toBe(125829120); // 120 MiB
        expect(api.memLimit).toBe(536870912); // 512 MiB
        expect(api.netRx).toBe(1020); // 1.02 kB
        expect(api.netTx).toBe(512);
        expect(api.pids).toBe(12);
    });

it('stops at ps when stats command fails', () => {
        mockExecFileSync
            .mockImplementationOnce(() => MOCK_PS_JSON)
            .mockImplementationOnce(() => { throw new Error('stats failed'); });

        const result = docker.list();

        expect(result).toHaveLength(2);
        const api = result.find(c => c.name === 'api-server')!;
        expect(api.cpu).toBe(0);
        expect(api.state).toBe('running');
    });
});
