import { describe, it, expect, vi, afterEach } from 'vitest';

describe('render-loop benchmark', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('runs the benchmark and outputs JSON results', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        
        // Stateful mock of performance.now to simulate fast passage of time
        let mockTime = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => {
            mockTime += 150;
            return mockTime;
        });

        // Since it executes immediately upon import, we dynamically import it here
        await import('./render-loop.js');

        // Verify console.log was called
        expect(consoleSpy).toHaveBeenCalled();

        // Find the BENCH_RESULT_JSON line
        const logs = consoleSpy.mock.calls.map(call => call[0] as string);
        const jsonLine = logs.find(log => log.startsWith('BENCH_RESULT_JSON:'));
        expect(jsonLine).toBeDefined();

        const jsonStr = jsonLine!.substring('BENCH_RESULT_JSON:'.length).trim();
        const payload = JSON.parse(jsonStr);

        expect(payload.version).toBe(1);
        expect(payload.benchmark).toBe('render-loop');
        expect(payload.runMs).toBe(1000);
        expect(payload.results).toHaveLength(3);

        const sizes = [
            { cols: 80, rows: 24 },
            { cols: 120, rows: 40 },
            { cols: 200, rows: 50 },
        ];

        for (let i = 0; i < 3; i++) {
            expect(payload.results[i].cols).toBe(sizes[i].cols);
            expect(payload.results[i].rows).toBe(sizes[i].rows);
            expect(payload.results[i].frames).toBeGreaterThan(0);
            expect(payload.results[i].cellsPerSec).toBeGreaterThan(0);
        }
    });
});
