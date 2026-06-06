import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DevServer } from './server.js';
import { runCli } from './cli.js';

vi.mock('./server.js', () => {
    return {
        DevServer: vi.fn().mockImplementation(() => ({
            start: vi.fn(),
            stop: vi.fn()
        }))
    };
});

describe('CLI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('parses arguments and starts dev server', () => {
        runCli(['./my-dir', '--entry', 'src/main.ts']);

        expect(DevServer).toHaveBeenCalledWith(expect.objectContaining({
            rootDir: './my-dir',
            entry: 'src/main.ts',
            devTools: true
        }));
    });
});
