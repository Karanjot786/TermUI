import { describe, it, expect, vi, afterEach } from 'vitest';
import { execFileAsync } from './_exec.js';
import * as childProcess from 'node:child_process';

vi.mock('node:child_process', () => {
    return {
        execFile: vi.fn(),
    };
});

describe('execFileAsync', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should resolve stdout and stderr when execution succeeds', async () => {
        const spy = vi.spyOn(childProcess, 'execFile').mockImplementation(
            (file, args, opts, callback) => {
                const cb = typeof opts === 'function' ? opts : callback;
                cb(null, 'hello stdout', 'hello stderr');
                return {} as any;
            }
        );

        const result = await execFileAsync('test-bin', ['arg1'], { cwd: '/tmp' });
        expect(result).toEqual({
            stdout: 'hello stdout',
            stderr: 'hello stderr',
        });
        expect(spy).toHaveBeenCalledWith('test-bin', ['arg1'], { cwd: '/tmp', shell: false }, expect.any(Function));
    });

    it('should reject with error when execution fails', async () => {
        const mockError = new Error('Spawn failed');
        vi.spyOn(childProcess, 'execFile').mockImplementation(
            (file, args, opts, callback) => {
                const cb = typeof opts === 'function' ? opts : callback;
                cb(mockError, '', '');
                return {} as any;
            }
        );

        await expect(execFileAsync('test-bin', [])).rejects.toThrow('Spawn failed');
    });

    it('should reject when file path contains null bytes', async () => {
        await expect(execFileAsync('test-bin\0malicious', [])).rejects.toThrow('execFileAsync: file path contains null bytes');
    });

    it('should reject when an argument contains null bytes', async () => {
        await expect(execFileAsync('test-bin', ['safe', 'malicious\0arg'])).rejects.toThrow('execFileAsync: argument contains null bytes');
    });

    it('should always enforce shell: false even if caller passes shell: true in opts', async () => {
        // Security invariant: caller must never be able to re-enable shell execution
        const spy = vi.spyOn(childProcess, 'execFile').mockImplementation(
            (file, args, opts, callback) => {
                const cb = typeof opts === 'function' ? opts : callback;
                cb(null, '', '');
                return {} as any;
            }
        );

        // Even if caller attempts to pass shell: true, it must be overridden to false
        await execFileAsync('test-bin', [], { shell: true });
        const calledOpts = spy.mock.calls[0][2] as { shell: boolean };
        expect(calledOpts.shell).toBe(false);
    });
});

