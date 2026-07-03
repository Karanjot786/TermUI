import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http } from './http.js';

describe('http data provider', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 20, 12, 0, 0));
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('returns up status and maps correct latency on successful fetch', async () => {
        global.fetch = vi.fn().mockImplementation(async () => {
            // Mock latency of 50ms
            vi.advanceTimersByTime(50);
            return {
                ok: true,
                status: 200,
                text: async () => 'OK',
            };
        });

        const result = await http.ping('http://success.com');

        expect(global.fetch).toHaveBeenCalledWith('http://success.com', expect.objectContaining({
            method: 'GET',
            signal: expect.any(AbortSignal),
        }));

        expect(result).toEqual({
            name: 'http://success.com',
            url: 'http://success.com',
            status: 'up',
            latency: 50,
            statusCode: 200,
        });

        expect(http.latency('http://success.com')).toEqual([50]);
    });

    it('returns down status and maps correct latency on non-ok fetch response', async () => {
        global.fetch = vi.fn().mockImplementation(async () => {
            vi.advanceTimersByTime(30);
            return {
                ok: false,
                status: 503,
                text: async () => 'Service Unavailable',
            };
        });

        const result = await http.ping('http://fail.com');

        expect(result).toEqual({
            name: 'http://fail.com',
            url: 'http://fail.com',
            status: 'down',
            latency: 30,
            statusCode: 503,
        });

        expect(http.latency('http://fail.com')).toEqual([30]);
    });

    it('returns down status with status code 0 on network failures or timeouts', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

        const result = await http.ping('http://error.com');

        expect(result).toEqual({
            name: 'http://error.com',
            url: 'http://error.com',
            status: 'down',
            latency: 0,
            statusCode: 0,
        });
    });

    it('stores rolling history and caps it at MAX_HISTORY (100)', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => 'OK',
        });

        const url = 'http://rolling.com';

        // Ping 105 times
        for (let i = 0; i < 105; i++) {
            await http.ping(url);
        }

        const history = http.latency(url);
        expect(history).toHaveLength(100);
    });

    it('evicts the oldest url history when distinct URLs exceed MAX_URLS (100)', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => 'OK',
        });

        // Ping 101 distinct URLs
        for (let i = 0; i < 101; i++) {
            await http.ping(`http://url-${i}.com`);
        }

        // The first URL should be evicted
        expect(http.latency('http://url-0.com')).toEqual([]);
        // The last URL should still exist
        expect(http.latency('http://url-100.com')).toHaveLength(1);
    });

    it('checks all endpoints and resolves results concurrently', async () => {
        let callCount = 0;
        const times = [1000, 1000, 1020, 1040];
        vi.spyOn(Date, 'now').mockImplementation(() => {
            return times[callCount++];
        });

        global.fetch = vi.fn().mockImplementation(async (url) => {
            if (url === 'http://endpoint1.com') {
                return { ok: true, status: 200, text: async () => '' };
            } else {
                return { ok: false, status: 500, text: async () => '' };
            }
        });

        const endpoints = [
            { name: 'EP1', url: 'http://endpoint1.com' },
            { name: 'EP2', url: 'http://endpoint2.com' },
        ];

        const results = await http.checkAll(endpoints);

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({
            name: 'EP1',
            url: 'http://endpoint1.com',
            status: 'up',
            latency: 20,
            statusCode: 200,
        });
        expect(results[1]).toEqual({
            name: 'EP2',
            url: 'http://endpoint2.com',
            status: 'down',
            latency: 40,
            statusCode: 500,
        });
    });
});
