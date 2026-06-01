import { EventEmitter } from 'node:events';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSubprocess } from './useSubprocess.js';
import { setCurrentApp } from '../runtime.js';
import { spawn } from 'node:child_process';

vi.mock('node:child_process', () => ({
    spawn: vi.fn(),
}));

const mockSpawn = vi.mocked(spawn);

describe('useSubprocess', () => {
    beforeEach(() => {
        mockSpawn.mockReset();
    });

    afterEach(() => {
        setCurrentApp(null);
    });

    it('spawns a subprocess with inherited stdio and returns the exit code', async () => {
        const proc = new EventEmitter();

        mockSpawn.mockReturnValue(proc as any);

        const subprocess = useSubprocess();
        const promise = subprocess.run(['git', 'status']);

        proc.emit('close', 7);

        const code = await promise;

        expect(mockSpawn).toHaveBeenCalledWith('git', ['status'], {
            stdio: 'inherit',
        });
        expect(code).toBe(7);
    });

    it('exits raw mode before spawning and restores the TUI after exit', async () => {
        const app = {
            terminal: {
                exitRawMode: vi.fn(),
                enterRawMode: vi.fn(),
            },
            screen: {
                invalidate: vi.fn(),
            },
            requestRender: vi.fn(),
        } as any;

        setCurrentApp(app);

        const proc = new EventEmitter();
        mockSpawn.mockReturnValue(proc as any);

        const subprocess = useSubprocess();
        const promise = subprocess.run(['vim', 'file.txt']);

        expect(app.terminal.exitRawMode).toHaveBeenCalledOnce();

        proc.emit('close', 0);

        const code = await promise;

        expect(app.terminal.enterRawMode).toHaveBeenCalledOnce();
        expect(app.screen.invalidate).toHaveBeenCalledOnce();
        expect(app.requestRender).toHaveBeenCalledOnce();
        expect(code).toBe(0);
    });

    it('restores raw mode and re-renders when the subprocess emits an error', async () => {
        const app = {
            terminal: {
                exitRawMode: vi.fn(),
                enterRawMode: vi.fn(),
            },
            screen: {
                invalidate: vi.fn(),
            },
            requestRender: vi.fn(),
        } as any;

        setCurrentApp(app);

        const proc = new EventEmitter();
        mockSpawn.mockReturnValue(proc as any);

        const subprocess = useSubprocess();
        const promise = subprocess.run(['bad-command']);

        proc.emit('error', new Error('spawn failed'));

        await expect(promise).rejects.toThrow('spawn failed');

        expect(app.terminal.enterRawMode).toHaveBeenCalledOnce();
        expect(app.screen.invalidate).toHaveBeenCalledOnce();
        expect(app.requestRender).toHaveBeenCalledOnce();
    });

    it('throws when command is empty', async () => {
        const subprocess = useSubprocess();

        await expect(subprocess.run([])).rejects.toThrow(
            'useSubprocess.run requires a command',
        );
    });
});