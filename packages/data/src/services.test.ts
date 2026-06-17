import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecFileSync = vi.fn();

vi.mock('node:child_process', () => ({
    execFileSync: (...args: any[]) => {
        return mockExecFileSync(...args);
    },
}));

vi.mock('node:os', () => ({
    platform: vi.fn(() => 'linux'),
}));

const { services } = await import('./services.js');

const MOCK_SYSTEMCTL_SHOW_NGINX = [
    'Type=notify',
    'Restart=always',
    'ActiveState=active',
    'SubState=running',
    'MainPID=1234',
    'NRestarts=2',
    'ActiveEnterTimestamp=Mon 2026-06-01 08:00:00 UTC',
    'Description=nginx web server',
    '',
].join('\n');

const MOCK_SYSTEMCTL_SHOW_POSTGRES = [
    'Type=simple',
    'Restart=on-failure',
    'ActiveState=inactive',
    'SubState=dead',
    'MainPID=0',
    'NRestarts=0',
    'ActiveEnterTimestamp=n/a',
    'Description=PostgreSQL database server',
    '',
].join('\n');

const MOCK_PS_OUTPUT = '  2.5  3.1\n';

const MOCK_PM2_JLIST = JSON.stringify([
    {
        name: 'api-server',
        pid: 5678,
        pm2_env: { status: 'online', restart_time: 1, pm_uptime: Date.now() - 86400000 },
        monit: { cpu: 10, memory: 256 * 1024 * 1024 },
    },
]);

const { platform } = await import('node:os');

describe('services provider', () => {
    beforeEach(() => {
        mockExecFileSync.mockReset();
        (platform as unknown as ReturnType<typeof vi.fn>).mockReturnValue('linux');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns empty array for empty names list', () => {
        const result = services.list([]);
        expect(result).toEqual([]);
    });

    it('parses systemd output for active services', () => {
        mockExecFileSync
            .mockImplementationOnce(() => 'systemd 252')
            .mockImplementationOnce(() => MOCK_SYSTEMCTL_SHOW_NGINX)
            .mockImplementationOnce(() => MOCK_PS_OUTPUT);

        const result = services.list(['nginx']);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('nginx');
        expect(result[0].active).toBe(true);
        expect(result[0].status).toBe('running');
        expect(result[0].pid).toBe(1234);
        expect(result[0].restarts).toBe(2);
        expect(result[0].description).toBe('nginx web server');
        expect(result[0].cpu).toBe(2.5);
        expect(result[0].mem).toBe(3.1);
    });

    it('parses systemd output for inactive services', () => {
        mockExecFileSync
            .mockImplementationOnce(() => 'systemd 252')
            .mockImplementationOnce(() => MOCK_SYSTEMCTL_SHOW_POSTGRES);

        const result = services.list(['postgresql']);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('postgresql');
        expect(result[0].active).toBe(false);
        expect(result[0].status).toBe('dead');
        expect(result[0].pid).toBe(0);
        expect(result[0].cpu).toBe(0);
        expect(result[0].mem).toBe(0);
        expect(result[0].uptime).toBe('0s');
    });

    it('falls back to PM2 when systemctl is unavailable', () => {
        mockExecFileSync
            .mockImplementationOnce(() => { throw new Error('systemctl not found'); })
            .mockImplementationOnce(() => MOCK_PM2_JLIST);

        const result = services.list(['api-server']);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('api-server');
        expect(result[0].active).toBe(true);
        expect(result[0].pid).toBe(5678);
        expect(result[0].cpu).toBe(10);
        expect(result[0].mem).toBe(256);
    });

    it('falls back to process matching for unknown services', () => {
        const MOCK_PS_AUX = [
            'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
            'root      1234  2.5  3.1 123456 78900 ?        Ss   Jun01   0:10 /usr/sbin/nginx',
            'root      5678  1.2  0.5 654321 12345 ?        Ss   Jun01   0:05 /usr/bin/redis-server',
        ].join('\n');

        mockExecFileSync
            .mockImplementationOnce(() => { throw new Error('systemctl not found'); })
            .mockImplementationOnce(() => { throw new Error('pm2 not found'); })
            .mockImplementationOnce(() => MOCK_PS_AUX);

        const result = services.list(['nginx']);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('nginx');
        expect(result[0].active).toBe(true);
        expect(result[0].pid).toBe(1234);
        expect(result[0].cpu).toBe(2.5);
    });

    it('returns inactive entry when process is not found', () => {
        mockExecFileSync
            .mockImplementationOnce(() => { throw new Error('systemctl not found'); })
            .mockImplementationOnce(() => { throw new Error('pm2 not found'); })
            .mockImplementationOnce(() => 'USER PID %CPU %MEM COMMAND\n');

        const result = services.list(['nonexistent-service']);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('nonexistent-service');
        expect(result[0].active).toBe(false);
        expect(result[0].status).toBe('stopped');
    });
});
