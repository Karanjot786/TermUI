import { describe, it, expect, vi, afterEach } from 'vitest';
import { networkInterfaces, hostname } from 'node:os';
import { network } from './network.js';

vi.mock('node:os', () => ({
    networkInterfaces: vi.fn(),
    hostname: vi.fn(),
}));

describe('network provider', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('interfaces', () => {
        it('filters network interfaces correctly (IPv4 and non-internal only)', () => {
            const mockInterfaces = {
                lo: [
                    { address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true, cidr: '127.0.0.1/8' }
                ],
                eth0: [
                    { address: '192.168.1.15', netmask: '255.255.255.0', family: 'IPv4', mac: '00:1a:2b:3c:4d:5e', internal: false, cidr: '192.168.1.15/24' },
                    { address: 'fe80::1a2b:3c4d:5e6f:7a8b', netmask: 'ffff:ffff:ffff:ffff::', family: 'IPv6', mac: '00:1a:2b:3c:4d:5e', internal: false, cidr: 'fe80::1a2b:3c4d:5e6f:7a8b/64' }
                ],
                wlan0: [
                    { address: '10.0.0.50', netmask: '255.255.255.0', family: 'IPv4', mac: '00:1a:2b:3c:4d:5f', internal: false, cidr: '10.0.0.50/24' }
                ]
            };

            vi.mocked(networkInterfaces).mockReturnValue(mockInterfaces as any);

            const result = network.interfaces;
            expect(result).toHaveLength(2);

            expect(result[0]).toEqual({
                name: 'eth0',
                address: '192.168.1.15',
                family: 'IPv4',
                mac: '00:1a:2b:3c:4d:5e',
                internal: false
            });

            expect(result[1]).toEqual({
                name: 'wlan0',
                address: '10.0.0.50',
                family: 'IPv4',
                mac: '00:1a:2b:3c:4d:5f',
                internal: false
            });
        });

        it('returns empty array if no network interfaces match or are found', () => {
            vi.mocked(networkInterfaces).mockReturnValue({});
            expect(network.interfaces).toEqual([]);
        });
    });

    describe('ip', () => {
        it('returns the first active IPv4 address', () => {
            const mockInterfaces = {
                eth0: [
                    { address: '192.168.1.15', family: 'IPv4', internal: false, mac: '00:00:00:00:00:00' }
                ],
                wlan0: [
                    { address: '10.0.0.50', family: 'IPv4', internal: false, mac: '00:00:00:00:00:00' }
                ]
            };
            vi.mocked(networkInterfaces).mockReturnValue(mockInterfaces as any);
            expect(network.ip).toBe('192.168.1.15');
        });

        it('defaults to 127.0.0.1 if no active interfaces are found', () => {
            vi.mocked(networkInterfaces).mockReturnValue({});
            expect(network.ip).toBe('127.0.0.1');
        });
    });

    describe('hostname', () => {
        it('forwards hostname from os.hostname', () => {
            vi.mocked(hostname).mockReturnValue('my-test-host');
            expect(network.hostname).toBe('my-test-host');
        });
    });
});
