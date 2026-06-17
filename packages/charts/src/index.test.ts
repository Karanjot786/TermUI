// ─────────────────────────────────────────────────────
// @termuijs/charts — Tests for the charts dashboard bundle
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { AreaChart, PieChart, Gauge } from './index.js';

describe('@termuijs/charts exports', () => {
    it('AreaChart renders into a Screen without throwing', () => {
        const widget = new AreaChart();
        widget.setData([1, 2, 3, 4, 5]);
        const screen = new Screen(20, 10);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        widget.render(screen);
        const rows = screen.back.map((row: { char: string }[]) => row.map(c => c.char).join(''));
        expect(rows.some(row => row.trim().length > 0)).toBe(true);
    });

    it('PieChart renders into a Screen without throwing', () => {
        const widget = new PieChart({
            slices: [
                { label: 'A', value: 30, color: 'cyan' },
                { label: 'B', value: 70, color: 'magenta' },
            ],
        });
        const screen = new Screen(20, 10);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        widget.render(screen);
        const allChars = screen.back.flat().map((c: { char: string }) => c.char).join('');
        expect(allChars.trim().length).toBeGreaterThan(0);
    });

    it('Gauge renders into a Screen without throwing', () => {
        const widget = new Gauge('CPU');
        widget.setValue(0.5);
        const screen = new Screen(20, 1);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        widget.render(screen);
        const row = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(row.trim().length).toBeGreaterThan(0);
    });
});
