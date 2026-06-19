import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecFileSync = vi.fn();

vi.mock('node:child_process', () => ({
    execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

// Setup fake timers before importing the module
vi.useFakeTimers();
let fakeTime = 1773921600000; // June 18, 2026 12:00:00
vi.setSystemTime(fakeTime);

const { disk } = await import('./disk.js');

describe('disk provider', () => {
    beforeEach(() => {
        // Move time forward by 100 seconds for each test to automatically invalidate any cache from previous tests
        fakeTime += 100000;
        vi.setSystemTime(fakeTime);
        mockExecFileSync.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('parses macOS df output correctly', () => {
        const macOutput = 
            'Filesystem        Size    Used   Avail Capacity iused ifree %iused  Mounted on\n' +
            '/dev/disk1s4s1   932Gi    12Gi   634Gi     2%    459k  4.3G    5%   /\n' +
            'devfs            201Ki   201Ki     0Bi   100%     694     0  100%   /dev\n';

        mockExecFileSync.mockReturnValue(macOutput);

        const parts = disk.partitions;
        // devfs should be ignored
        expect(parts).toHaveLength(1);
        expect(parts[0]).toEqual({
            filesystem: '/dev/disk1s4s1',
            size: '932Gi',
            used: '12Gi',
            available: '634Gi',
            percent: 5,
            mountpoint: '/',
        });

        expect(disk.percent).toBe(5);
        expect(disk.main).toEqual(parts[0]);
    });

    it('parses Linux df output correctly', () => {
        const linuxOutput = 
            'Filesystem      Size  Used Avail Use% Mounted on\n' +
            '/dev/sda1        20G   12G    8G  60% /\n' +
            '/dev/sdb1        50G   10G   40G  20% /data\n';

        mockExecFileSync.mockReturnValue(linuxOutput);

        const parts = disk.partitions;
        expect(parts).toHaveLength(2);
        expect(parts[0]).toEqual({
            filesystem: '/dev/sda1',
            size: '20G',
            used: '12G',
            available: '8G',
            percent: 60,
            mountpoint: '/',
        });
        expect(parts[1]).toEqual({
            filesystem: '/dev/sdb1',
            size: '50G',
            used: '10G',
            available: '40G',
            percent: 20,
            mountpoint: '/data',
        });

        expect(disk.percent).toBe(60);
        expect(disk.main).toEqual(parts[0]);
    });

    it('caches partitions data and respects cache timeout (5000ms)', () => {
        const initialOutput = 
            'Filesystem      Size  Used Avail Use% Mounted on\n' +
            '/dev/sda1        20G   12G    8G  60% /\n';
        const secondOutput = 
            'Filesystem      Size  Used Avail Use% Mounted on\n' +
            '/dev/sda1        20G   15G    5G  75% /\n';

        mockExecFileSync.mockReturnValue(initialOutput);

        // First call gets initial values
        const parts1 = disk.partitions;
        expect(parts1[0].percent).toBe(60);
        expect(mockExecFileSync).toHaveBeenCalledTimes(1);

        // Second call within 4 seconds: should use cached values
        mockExecFileSync.mockReturnValue(secondOutput);
        fakeTime += 4000;
        vi.setSystemTime(fakeTime);
        const parts2 = disk.partitions;
        expect(parts2[0].percent).toBe(60);
        expect(mockExecFileSync).toHaveBeenCalledTimes(1);

        // Third call after another 2 seconds (total 6 seconds): cache should expire
        fakeTime += 2000;
        vi.setSystemTime(fakeTime);
        const parts3 = disk.partitions;
        expect(parts3[0].percent).toBe(75);
        expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });

    it('handles command failures and parses empty array', () => {
        mockExecFileSync.mockImplementation(() => {
            throw new Error('Command failed');
        });

        const parts = disk.partitions;
        expect(parts).toEqual([]);
        expect(disk.percent).toBe(0);
        expect(disk.main).toBeNull();
    });

    it('handles unexpected short output gracefully', () => {
        const badOutput = 
            'Filesystem      Size  Used Avail Use% Mounted on\n' +
            '/dev/sda1        20G\n'; // Missing fields

        mockExecFileSync.mockReturnValue(badOutput);

        const parts = disk.partitions;
        expect(parts).toEqual([]);
    });
});
