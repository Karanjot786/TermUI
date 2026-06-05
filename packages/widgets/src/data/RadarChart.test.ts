import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { RadarChart } from './RadarChart.js';

describe('RadarChart Widget', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders a single series with 3 axes without error', () => {
        const screen = new Screen(40, 20);
        const chart = new RadarChart({}, { axes: ['A', 'B', 'C'] });
        chart.updateRect({ x: 0, y: 0, width: 40, height: 20 });
        
        chart.setSeries([{ label: 'Test', values: [1, 0.5, 0.8] }]);
        expect(() => chart.render(screen)).not.toThrow();
    });

    it('setSeries triggers markDirty', () => {
        const chart = new RadarChart();
        const spy = vi.spyOn(chart, 'markDirty');
        
        chart.setSeries([{ label: 'Test', values: [1, 0.5, 0.8] }]);
        expect(spy).toHaveBeenCalled();
    });

    it('empty series renders an empty widget', () => {
        const screen = new Screen(40, 20);
        const chart = new RadarChart();
        chart.updateRect({ x: 0, y: 0, width: 40, height: 20 });
        
        chart.setSeries([]);
        chart.render(screen);
        
        const out = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(out.trim()).toBe('');
    });

    it('uses ASCII fallback (*) when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        
        const screen = new Screen(40, 20);
        const chart = new RadarChart({}, { axes: ['Speed', 'Power', 'Agility'] });
        chart.updateRect({ x: 0, y: 0, width: 40, height: 20 });
        
        chart.setSeries([{ label: 'Test', values: [1, 0.5, 0.8] }]);
        chart.render(screen);
        
        const out = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        
        expect(out).toContain('*');
        expect(out).toContain('Speed');
        expect(out).toContain('Power');
        expect(out).toContain('Agility');
    });
});