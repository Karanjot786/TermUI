import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecFileSync = vi.fn();

vi.mock('node:child_process', () => ({
    execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

// Setup fake timers before importing the module
vi.useFakeTimers();
let fakeTime = 1773921600000;
vi.setSystemTime(fakeTime);

const { processes } = await import('./processes.js');

describe('processes provider', () => {
    beforeEach(() => {
        // Invalidate cache between tests
        fakeTime += 50000;
        vi.setSystemTime(fakeTime);
        mockExecFileSync.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('parses ps output correctly (Linux style)', () => {
        const mockOutput = 
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' +
            'root         1  0.1  0.2   1234   567 ?        Ss   12:00   0:01 /sbin/init\n' +
            'pro       1234  5.2  1.5  54321  9876 ?        S    12:01   0:05 /usr/bin/node /app/index.js\n';

        mockExecFileSync.mockReturnValue(mockOutput);

        const list = processes.list;
        expect(mockExecFileSync).toHaveBeenCalledWith('ps', ['aux', '--sort=-%cpu'], expect.any(Object));
        expect(list).toHaveLength(2);
        
        expect(list[0]).toEqual({
            user: 'root',
            pid: 1,
            cpu: 0.1,
            mem: 0.2,
            name: 'init',
        });

        expect(list[1]).toEqual({
            user: 'pro',
            pid: 1234,
            cpu: 5.2,
            mem: 1.5,
            name: 'index.js',
        });

        expect(processes.count).toBe(2);
    });

    it('falls back to macOS ps command on Linux ps command failure', () => {
        const mockOutput = 
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' +
            'pro       5678  1.0  0.5   5432   987 ?        S    12:02   0:00 /usr/bin/zsh\n';

        mockExecFileSync
            .mockImplementationOnce(() => {
                throw new Error('Linux sort option unsupported');
            })
            .mockReturnValueOnce(mockOutput);

        const list = processes.list;
        expect(mockExecFileSync).toHaveBeenCalledTimes(2);
        expect(mockExecFileSync.mock.calls[0][1]).toContain('--sort=-%cpu');
        expect(mockExecFileSync.mock.calls[1][1]).toContain('-r');

        expect(list).toHaveLength(1);
        expect(list[0]).toEqual({
            user: 'pro',
            pid: 5678,
            cpu: 1.0,
            mem: 0.5,
            name: 'zsh',
        });
    });

    it('caches process list and respects cache timeout (2000ms)', () => {
        const output1 = 
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' +
            'root         1  0.1  0.2   1234   567 ?        Ss   12:00   0:01 /sbin/init\n';
        const output2 = 
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' +
            'root         1  0.5  0.2   1234   567 ?        Ss   12:00   0:01 /sbin/init\n';

        mockExecFileSync.mockReturnValue(output1);

        const list1 = processes.list;
        expect(list1[0].cpu).toBe(0.1);
        expect(mockExecFileSync).toHaveBeenCalledTimes(1);

        // Call within 1.5s: should use cache
        mockExecFileSync.mockReturnValue(output2);
        fakeTime += 1500;
        vi.setSystemTime(fakeTime);
        const list2 = processes.list;
        expect(list2[0].cpu).toBe(0.1);
        expect(mockExecFileSync).toHaveBeenCalledTimes(1);

        // Call after 2.5s (total): cache should expire
        fakeTime += 1000;
        vi.setSystemTime(fakeTime);
        const list3 = processes.list;
        expect(list3[0].cpu).toBe(0.5);
        expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });

    it('handles total command failures gracefully', () => {
        mockExecFileSync.mockImplementation(() => {
            throw new Error('All commands failed');
        });

        const list = processes.list;
        expect(list).toEqual([]);
        expect(processes.count).toBe(0);
    });

    it('handles unexpected short output lines by returning defaults', () => {
        const mockOutput = 
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' +
            'root         1\n'; // Less than 11 columns

        mockExecFileSync.mockReturnValue(mockOutput);

        const list = processes.list;
        expect(list).toHaveLength(1);
        expect(list[0]).toEqual({
            user: '',
            pid: 0,
            cpu: 0,
            mem: 0,
            name: 'unknown',
        });
    });

    it('returns top N processes correctly via processes.top(N)', () => {
        const mockOutput = 
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' +
            'pro        101  1.0  0.1   1000   100 ?        S    12:00   0:00 proc1\n' +
            'pro        102  2.0  0.2   1000   100 ?        S    12:00   0:00 proc2\n' +
            'pro        103  3.0  0.3   1000   100 ?        S    12:00   0:00 proc3\n';

        mockExecFileSync.mockReturnValue(mockOutput);

        const top2 = processes.top(2);
        expect(top2).toHaveLength(2);
        expect(top2[0].pid).toBe(101);
        expect(top2[1].pid).toBe(102);
    });

    it('reports total process count separately from the capped list', () => {
        const rows = Array.from({ length: 75 }, (_, index) => {
            const pid = 1000 + index;
            return `pro       ${pid}  1.0  0.1   1000   100 ?        S    12:00   0:00 proc${index}`;
        });
        const mockOutput =
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' +
            rows.join('\n') +
            '\n';

        mockExecFileSync.mockReturnValue(mockOutput);

        expect(processes.list).toHaveLength(50);
        expect(processes.count).toBe(75);
    });
});
