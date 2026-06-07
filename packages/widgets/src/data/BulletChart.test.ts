// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for BulletChart widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('BulletChart', () => {
    it('initializes with 0 value and target', async () => {
        const { BulletChart } = await import('./BulletChart.js');
        const chart = new BulletChart();
        expect(chart).toBeDefined();
    });

    it('setValue and setTarget clamp and independently call markDirty', async () => {
        const { BulletChart } = await import('./BulletChart.js');
        const chart = new BulletChart({}, { max: 100 });
        const markDirtySpy = vi.spyOn(chart, 'markDirty');
        
        chart.setValue(60);
        expect(markDirtySpy).toHaveBeenCalledTimes(1);
        
        chart.setTarget(80);
        expect(markDirtySpy).toHaveBeenCalledTimes(2);

        chart.setValue(150);
        expect(markDirtySpy).toHaveBeenCalledTimes(3);

        chart.setTarget(-10);
        expect(markDirtySpy).toHaveBeenCalledTimes(4);
    });

    it('renders value and target proportion correctly in unicode', async () => {
        const { Screen, caps } = await import('@termuijs/core');
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const { BulletChart } = await import('./BulletChart.js');

        const chart = new BulletChart({}, { max: 100 });
        chart.setValue(60);
        chart.setTarget(80);
        chart.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        chart.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        // 60% of 10 is 6. Value bars are at indices 0-5.
        // 80% of 10 is 8. Target marker is at index 8.
        expect(rendered[0]).toBe('▄');
        expect(rendered[5]).toBe('▄');
        expect(rendered[6]).toBe(' ');
        expect(rendered[8]).toBe('│');
    });

    it('uses ASCII chars when unicode is false', async () => {
        const { Screen, caps } = await import('@termuijs/core');
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const { BulletChart } = await import('./BulletChart.js');

        const chart = new BulletChart({}, { max: 100 });
        chart.setValue(50);
        chart.setTarget(70);
        chart.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        chart.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        // 50% of 10 is 5. Target at 70% is 7.
        expect(rendered).toContain('=');
        expect(rendered).toContain('|');
        expect(rendered).toContain('-');
        expect(rendered).not.toMatch(/[▄│]/);
        expect(rendered[7]).toBe('|');
    });

    it('renders range bands with correct background colors', async () => {
        const { Screen, caps } = await import('@termuijs/core');
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const { BulletChart } = await import('./BulletChart.js');

        const chart = new BulletChart({}, { 
            max: 100,
            ranges: [
                { to: 50, color: { type: 'named', name: 'red' } },
                { to: 100, color: { type: 'named', name: 'green' } }
            ]
        });
        chart.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        chart.render(screen);

        // Indices 0-5 are <= 50%, indices 6-9 are > 50%
        expect(screen.back[0][5].bg?.name).toBe('red');
        expect(screen.back[0][6].bg?.name).toBe('green');
    });
});
