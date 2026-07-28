// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for PieChart
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { PieChart } from './PieChart.js';

afterEach(() => {
    vi.restoreAllMocks();
});

const gridText = (screen: Screen): string =>
    screen.back.map(row => row.map(c => c.char).join('')).join('\n');

describe('PieChart', () => {
    it('renders a legend below the chart with label and percentage', () => {
        const pie = new PieChart({
            slices: [
                { label: 'TypeScript', value: 60, color: 'blue' },
                { label: 'JavaScript', value: 30, color: 'yellow' },
                { label: 'Other', value: 10, color: 'gray' },
            ],
        });
        pie.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        pie.render(screen);

        const text = gridText(screen);
        expect(text).toContain('TypeScript');
        expect(text).toContain('JavaScript');
        expect(text).toContain('Other');
        expect(text).toContain('60%');
        expect(text).toContain('30%');
        expect(text).toContain('10%');
    });

    it('renders proportional slices using unicode block chars', () => {
        const pie = new PieChart({
            slices: [
                { label: 'Big', value: 90, color: 'red' },
                { label: 'Tiny', value: 10, color: 'green' },
            ],
        });
        pie.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        pie.render(screen);

        const allText = gridText(screen);
        // The unicode pie should produce block characters
        expect(allText).toContain('\u2588');
        // The percentages in the legend should round to the expected values
        expect(allText).toContain('90%');
        expect(allText).toContain('10%');
    });

    it('uses ASCII bar chart fallback when unicode is off', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const pie = new PieChart({
            slices: [
                { label: 'A', value: 70, color: 'red' },
                { label: 'B', value: 30, color: 'blue' },
            ],
        });
        pie.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        const screen = new Screen(30, 10);
        pie.render(screen);

        const allText = gridText(screen);
        // No block char, only ASCII '#'
        expect(allText).not.toContain('\u2588');
        expect(allText).toContain('#');
    });

    it('a single slice fills 100% of the pie', () => {
        const pie = new PieChart({
            slices: [
                { label: 'All', value: 100, color: 'cyan' },
            ],
        });
        pie.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        pie.render(screen);

        const allText = gridText(screen);
        expect(allText).toContain('100%');
        // The pie portion should be filled with the block char
        expect(allText).toContain('\u2588');
    });

    it('does not render legend rows beyond the widget height', () => {
        const pie = new PieChart({
            slices: [
                { label: 'One', value: 1, color: 'red' },
                { label: 'Two', value: 1, color: 'blue' },
                { label: 'Three', value: 1, color: 'green' },
            ],
        });
        pie.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 4);
        pie.render(screen);

        const rows = screen.back.map(row => row.map(c => c.char).join(''));
        expect(rows[0]).toContain('One');
        expect(rows[1]).toContain('Two');
        expect(rows[2].trim()).toBe('');
    });
});
