import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { DevServer } from './server.js';
import { ThemeWatcher } from './theme-watcher.js';

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

vi.mock('node:fs', () => ({
    watch: vi.fn(() => new EventEmitter()),
    existsSync: vi.fn(() => true)
}));

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

    it('attaches the spawned child to the theme watcher', () => {
        const attachSpy = vi.spyOn(ThemeWatcher.prototype, 'attachChild');
        const server = new DevServer({
            rootDir: './project',
            entry: 'index.ts'
        });

        server.start();
        expect(attachSpy).toHaveBeenCalledWith(expect.any(Object));
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