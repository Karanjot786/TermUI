import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DevServer } from './server.js';

function createMockSubprocess() {
    return {
        kill: vi.fn(),
        send: vi.fn(() => true),
        exitCode: null,
        signalCode: null,
        killed: false,
        exited: Promise.resolve(0)
    };
}

vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs')>();
    return {
        ...actual,
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => ({
            on: vi.fn(),
            close: vi.fn()
        }))
    };
});

describe('DevServer', () => {
    let mockChild: any;

    beforeEach(() => {
        vi.useFakeTimers();
        mockChild = createMockSubprocess();
        (globalThis as any).Bun = {
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
        expect((globalThis as any).Bun.spawn).toHaveBeenCalled();
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
});