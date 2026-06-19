import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DevServer } from './server.js';

function createMockSubprocess() {
    return {
        kill: vi.fn(),
        send: vi.fn(() => true),
        exitCode: null,
        signalCode: null,
        killed: false,
        exited: Promise.resolve(0),
        stderr: {
            getReader: vi.fn(() => ({
                read: vi.fn(() =>
                    Promise.resolve({ done: true, value: undefined })
                )
            }))
        }
    };
}

const { mockExistsSync, mockWatch } = vi.hoisted(() => ({
    mockExistsSync: vi.fn(() => true),
    mockWatch: vi.fn(() => ({ on: vi.fn(), close: vi.fn() })),
}));

vi.mock('node:fs', async () => {
    const actual = await import('node:fs');
    return {
        ...actual,
        existsSync: mockExistsSync,
        watch: mockWatch,
    
    };
});

describe('DevServer', () => {
    let mockChild: ReturnType<typeof createMockSubprocess>;

    beforeEach(() => {
        vi.useFakeTimers();

        mockChild = createMockSubprocess();

        (globalThis as unknown as {
            Bun: {
                spawn: ReturnType<typeof vi.fn>;
            };
        }).Bun = {
            spawn: vi.fn(() => mockChild)
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('spawns the entry file configuration correctly', () => {
        const server = new DevServer({
            rootDir: './project',
            entry: 'src/index.tsx'
        });

        server.start();

        expect(
            (
                globalThis as unknown as {
                    Bun: {
                        spawn: ReturnType<typeof vi.fn>;
                    };
                }
            ).Bun.spawn
        ).toHaveBeenCalled();
    });

    it('handles server shutdown cleanly', () => {
        const server = new DevServer({
            rootDir: './project',
            entry: 'index.ts'
        });

        server.start();
        server.stop();

        expect(server.isRunning).toBe(false);
        expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('sets banner after a respawn', async () => {
        const server = new DevServer({
            rootDir: './project',
            entry: 'index.ts',
            bannerMs: 1000
        });

        server.start();

        server['_handleChange']({
            filename: 'app.ts',
            type: 'tsx'
        });

        await vi.advanceTimersByTimeAsync(500);

        expect(server.banner).toBe('Reloaded');
    });

    it('clears banner after bannerMs timeout', async () => {
        const server = new DevServer({
            rootDir: './project',
            entry: 'index.ts',
            bannerMs: 1000
        });

        server.start();

        server['_handleChange']({
            filename: 'app.ts',
            type: 'tsx'
        });

        await vi.advanceTimersByTimeAsync(500);

        expect(server.banner).toBe('Reloaded');

        await vi.advanceTimersByTimeAsync(1000);

        expect(server.banner).toBe(null);
    });

    it('uses default bannerMs value of 1500', async () => {
        const server = new DevServer({
            rootDir: './project',
            entry: 'index.ts'
        });

        server.start();

        server['_handleChange']({
            filename: 'app.ts',
            type: 'tsx'
        });

        await vi.advanceTimersByTimeAsync(500);

        expect(server.banner).toBe('Reloaded');

        // Banner was set at ~debounce time (200ms); with 1500ms bannerMs it
        // expires at ~1700ms. Advance to ~1400ms total — still within the window.
        await vi.advanceTimersByTimeAsync(900);

        expect(server.banner).toBe('Reloaded');

        // Advance past the 1500ms bannerMs expiry (to ~2000ms total).
        await vi.advanceTimersByTimeAsync(600);

        expect(server.banner).toBe(null);
    });

    it('clears pending banner timer on stop', async () => {
        const server = new DevServer({
            rootDir: './project',
            entry: 'index.ts',
            bannerMs: 1000
        });

        server.start();

        server['_handleChange']({
            filename: 'app.ts',
            type: 'tsx'
        });

        await vi.advanceTimersByTimeAsync(500);

        expect(server.banner).toBe('Reloaded');

        server.stop();

        expect(server.banner).toBe(null);
    });
});