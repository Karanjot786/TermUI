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
        expect(() => widget.render(screen)).not.toThrow();
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
        expect(() => widget.render(screen)).not.toThrow();
    });

    it('Gauge renders into a Screen without throwing', () => {
        const widget = new Gauge('CPU');
        widget.setValue(0.5);
        const screen = new Screen(20, 1);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        expect(() => widget.render(screen)).not.toThrow();
    });
});
