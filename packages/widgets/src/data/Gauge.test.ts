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
        const { Screen } = await import('@termuijs/core');
        const g = new Gauge('CPU');
        g.setLabel('Memory');
        g.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        g.render(screen);
        const row = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(row).toContain('Memory');
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

    it('setLabel marks the widget dirty', async () => {
        const { Gauge } = await import('./Gauge.js');
        const g = new Gauge('CPU');
        g.clearDirty();
        g.setLabel('Memory');
        expect(g.isDirty).toBe(true);
    });

    it('setValue marks the widget dirty when called on a clean widget', async () => {
        const { Gauge } = await import('./Gauge.js');
        const g = new Gauge('CPU');
        g.setValue(0.5);
        g.clearDirty();
        g.setValue(0.75);
        expect(g.isDirty).toBe(true);
    });

    // Gauge.setValue always calls markDirty() regardless of whether the value
    // changed. This differs from ProgressBar.setValue which guards with an
    // early return when the value is unchanged. This test documents the current
    // intentional behaviour so that a future refactor does not silently break it.
    it('setValue marks the widget dirty even when the value is unchanged', async () => {
        const { Gauge } = await import('./Gauge.js');
        const g = new Gauge('CPU');
        g.setValue(0.5);
        g.clearDirty();
        g.setValue(0.5);
        expect(g.isDirty).toBe(true);
    });
});

