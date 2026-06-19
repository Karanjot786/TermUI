import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockConnect = vi.fn();
const mockExecFileSync = vi.fn();

vi.mock('node:net', () => ({
    connect: (...args: unknown[]) => mockConnect(...args),
}));

vi.mock('node:child_process', () => ({
    execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

function makeMockSocket() {
    const events: Record<string, (args?: unknown) => void> = {};
    return {
        destroy: vi.fn(),
        setTimeout: vi.fn(),
        on: vi.fn((event: string, cb: (args?: unknown) => void) => {
            events[event] = cb;
            return this;
        }),
        emit: (event: string, arg?: unknown) => {
            if (events[event]) events[event](arg);
        },
        _events: events,
    };
}

const { database } = await import('./database.js');

describe('database provider', () => {
    beforeEach(() => {
        mockConnect.mockReset();
        mockExecFileSync.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns connected result with latency on successful TCP ping', async () => {
        const socket = makeMockSocket();
        mockConnect.mockImplementation((_port: number, _host: string, cb: () => void) => {
            setTimeout(cb, 0);
            return socket;
        });

        const result = await database.ping({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
        });

        expect(result.connected).toBe(true);
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        expect(result.activeConnections).toBeNull();
        expect(result.maxConnections).toBeNull();
        expect(result.poolPercent).toBeNull();
    });

    it('returns disconnected result on TCP failure', async () => {
        const socket = makeMockSocket();
        mockConnect.mockImplementation((_port: number, _host: string, _cb: () => void) => {
            setTimeout(() => socket._events.error?.(new Error('Connection refused')), 0);
            return socket;
        });

        const result = await database.ping({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
        });

        expect(result.connected).toBe(false);
        expect(result.latencyMs).toBe(0);
    });

    it('tries pg_isready and psql for Postgres metrics', async () => {
        const socket = makeMockSocket();
        mockConnect.mockImplementation((_port: number, _host: string, cb: () => void) => {
            setTimeout(cb, 0);
            return socket;
        });

        mockExecFileSync
            .mockImplementationOnce(() => 'pg_isready: accepting connections')
            .mockImplementationOnce(() => '100')
            .mockImplementationOnce(() => '5');

        const result = await database.ping({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'test',
            database: 'testdb',
        });

        expect(result.connected).toBe(true);
        expect(result.maxConnections).toBe(100);
        expect(result.activeConnections).toBe(5);
        expect(result.poolPercent).toBe(5);
    });

    it('tries mysql ping and mysql CLI for MySQL metrics', async () => {
        const socket = makeMockSocket();
        mockConnect.mockImplementation((_port: number, _host: string, cb: () => void) => {
            setTimeout(cb, 0);
            return socket;
        });

        mockExecFileSync
            .mockImplementationOnce(() => 'mysqld is alive')
            .mockImplementationOnce(() => 'max_connections\t200')
            .mockImplementationOnce(() => '10');

        const result = await database.ping({
            type: 'mysql',
            host: 'localhost',
            port: 3306,
        });

        expect(result.connected).toBe(true);
        expect(result.maxConnections).toBe(200);
        expect(result.activeConnections).toBe(10);
        expect(result.poolPercent).toBe(5);
    });

    it('returns null pool metrics when CLI tools are unavailable', async () => {
        const socket = makeMockSocket();
        mockConnect.mockImplementation((_port: number, _host: string, cb: () => void) => {
            setTimeout(cb, 0);
            return socket;
        });

        mockExecFileSync.mockImplementation(() => { throw new Error('command not found'); });

        const result = await database.ping({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
        });

        expect(result.connected).toBe(true);
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        expect(result.activeConnections).toBeNull();
        expect(result.maxConnections).toBeNull();
        expect(result.poolPercent).toBeNull();
    });

    it('returns zero pool percent when maxConnections is 0', async () => {
        const socket = makeMockSocket();
        mockConnect.mockImplementation((_port: number, _host: string, cb: () => void) => {
            setTimeout(cb, 0);
            return socket;
        });

        mockExecFileSync
            .mockImplementationOnce(() => 'pg_isready: accepting connections')
            .mockImplementationOnce(() => '0')
            .mockImplementationOnce(() => '5');

        const result = await database.ping({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
        });

        expect(result.poolPercent).toBeNull();
    });
});
