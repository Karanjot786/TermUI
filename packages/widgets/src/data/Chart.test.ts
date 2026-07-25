import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Chart } from './Chart.js';

describe('Chart', () => {
    let screen: Screen;
    
    beforeEach(() => {
        screen = new Screen(40, 10);
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders a line chart', () => {
        const chart = new Chart({
            type: 'line',
            series: [{ label: 'A', color: 'red', data: [0, 10] }]
        });
        chart.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        chart.render(screen);
        
        // Assert some braille characters are drawn
        const content = screen.back.map(r => r.map(c => c.char).join('')).join('');
        expect(content).toMatch(/[⠁-⣿]/);
    });

    it('renders a bar chart', () => {
        const chart = new Chart({
            type: 'bar',
            series: [{ label: 'B', color: 'blue', data: [5, 5, 5] }]
        });
        chart.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        chart.render(screen);
        
        const content = screen.back.map(r => r.map(c => c.char).join('')).join('');
        expect(content).toMatch(/[⠁-⣿]/);
    });

    it('renders axes and labels when showAxes is true', () => {
        const chart = new Chart({
            showAxes: true,
            series: [{ label: 'C', color: 'green', data: [0, 10] }]
        });
        chart.updateRect({ x: 0, y: 0, width: 15, height: 5 });
        chart.render(screen);
        
        // Y-axis top tick with max
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('10.0┤');
        
        // X-axis line at the bottom
        const row4 = screen.back[4].map(c => c.char).join('');
        expect(row4).toContain('└────');
    });

    it('renders legend when multiple series are provided', () => {
        const chart = new Chart({
            series: [
                { label: 'CPU', color: 'green', data: [1] },
                { label: 'RAM', color: 'blue', data: [2] }
            ]
        });
        chart.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        chart.render(screen);
        
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('CPU');
        expect(row0).toContain('RAM');
    });
});
