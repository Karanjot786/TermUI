import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { ScatterPlot } from './ScatterPlot.js';

describe('ScatterPlot Widget', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders a single data point inside widget bounds', () => {
        const screen = new Screen(20, 10);
        const plot = new ScatterPlot();
        plot.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        plot.setData([{ x: 1, y: 1 }]);
        expect(() => plot.render(screen)).not.toThrow();
    });

    it('multiple points plot without error and display axes', () => {
        const screen = new Screen(20, 10);
        const plot = new ScatterPlot({}, { xLabel: 'X Axis', yLabel: 'Y Axis' });
        plot.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        plot.setData([
            { x: 1, y: 1 },
            { x: 10, y: 10 },
            { x: 5, y: 5 }
        ]);
        expect(() => plot.render(screen)).not.toThrow();
        
        const content = screen.back.map(row => row.map(c => c.char).join('')).join('');
        expect(content).toContain('X Axis');
        expect(content).toContain('Y Axis');
    });

    it('setData triggers markDirty', () => {
        const plot = new ScatterPlot();
        const spy = vi.spyOn(plot, 'markDirty');
        plot.setData([{ x: 1, y: 1 }]);
        expect(spy).toHaveBeenCalled();
    });

    it('clamps long axis labels to the widget width', () => {
        const screen = new Screen(8, 4);
        const plot = new ScatterPlot({}, {
            xLabel: 'Very long x axis label',
            yLabel: 'Very long y axis label',
        });
        plot.updateRect({ x: 0, y: 0, width: 8, height: 4 });
        plot.render(screen);

        const rows = screen.back.map(row => row.map(c => c.char).join(''));
        expect(rows.join('\n')).not.toContain('axis label');
        expect(rows[0].trimEnd().length).toBeLessThanOrEqual(8);
        expect(rows[3].trimEnd().length).toBeLessThanOrEqual(8);
    });

    it('renders inside the content rect when padding is set', () => {
        const screen = new Screen(12, 6);
        const plot = new ScatterPlot({ padding: { left: 2, top: 1, right: 0, bottom: 0 } });
        plot.updateRect({ x: 0, y: 0, width: 12, height: 6 });
        plot.setData([{ x: 1, y: 1 }]);

        plot.render(screen);

        expect(screen.back[0].map(c => c.char).join('').trim()).toBe('');
        expect(screen.back[1][0].char).toBe(' ');
        expect(screen.back[1][1].char).toBe(' ');
        expect(screen.back[1][2].char).not.toBe(' ');
    });

    it('ASCII fallback renders "." when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        
        const screen = new Screen(10, 10);
        const plot = new ScatterPlot();
        plot.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        plot.setData([{ x: 5, y: 5 }]);
        plot.render(screen);
        
        const content = screen.back.map(row => row.map(c => c.char).join('')).join('');
        expect(content).toContain('.');
        // Check for ASCII axes
        expect(content).toContain('|');
        expect(content).toContain('-');
    });

    it('Unicode fallback renders "•" when caps.unicode is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        
        const screen = new Screen(10, 10);
        const plot = new ScatterPlot();
        plot.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        plot.setData([{ x: 5, y: 5 }]);
        plot.render(screen);
        
        const content = screen.back.map(row => row.map(c => c.char).join('')).join('');
        expect(content).toContain('•');
        // Check for Unicode axes
        expect(content).toContain('│');
        expect(content).toContain('─');
    });
});
