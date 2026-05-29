// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Gauge widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Gauge', () => {
    it('initializes with 0 value', async () => {
        const { Gauge } = await import('./Gauge.js');
        const g = new Gauge('CPU');
        expect(g.getValue()).toBe(0);
    });

    it('setValue sets and clamps the value', async () => {
        const { Gauge } = await import('./Gauge.js');
        const g = new Gauge('CPU');
        g.setValue(0.75);
        expect(g.getValue()).toBe(0.75);
        g.setValue(1.5);
        expect(g.getValue()).toBe(1);
        g.setValue(-0.5);
        expect(g.getValue()).toBe(0);
    });

    it('setLabel updates the label', async () => {
        const { Gauge } = await import('./Gauge.js');
        const g = new Gauge('CPU');
        g.setLabel('Memory');
        expect(g).toBeDefined();
    });

    it('uses ASCII chars when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Gauge } = await import('./Gauge.js');

        const gauge = new Gauge('CPU');
        gauge.setValue(0.5);
        gauge.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        gauge.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('#');
        expect(rendered).toContain('-');
        expect(rendered).not.toMatch(/[█░]/);
    });

    it('uses unicode chars when unicode is available', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Gauge } = await import('./Gauge.js');

        const gauge = new Gauge('CPU');
        gauge.setValue(0.5);
        gauge.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        gauge.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toMatch(/[█░]/);
        expect(rendered).not.toContain('#');
    });
});

