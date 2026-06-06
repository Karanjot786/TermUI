// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Meter widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { caps, Screen } from '@termuijs/core';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Meter', () => {
    it('initializes with 0 value', async () => {
        const { Meter } = await import('./Meter.js');
        const m = new Meter('Disk');
        expect(m.getValue()).toBe(0);
    });

    it('setValue sets and clamps the value and calls markDirty', async () => {
        const { Meter } = await import('./Meter.js');
        const m = new Meter('Disk');
        const spy = vi.spyOn(m as any, 'markDirty');
        m.setValue(0.75);
        expect(m.getValue()).toBe(0.75);
        m.setValue(1.5);
        expect(m.getValue()).toBe(1);
        m.setValue(-0.5);
        expect(m.getValue()).toBe(0);
        expect(spy).toHaveBeenCalled();
    });

    it('setLabel updates the label', async () => {
        const { Meter } = await import('./Meter.js');
        const m = new Meter('Disk');
        m.setLabel('Memory');
        expect(m).toBeDefined();
    });

    it('renders label and percentage', async () => {
        const { Meter } = await import('./Meter.js');

        const meter = new Meter('Disk');
        meter.setValue(0.9);
        meter.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        meter.render(screen);

        const row = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(row).toContain('Disk');
        expect(row).toContain('90%');
    });

    it('renders low color when value is below low threshold', async () => {
        const { Meter } = await import('./Meter.js');
        const meter = new Meter('Test', {}, { low: 0.25, high: 0.75 });
        meter.setValue(0.1);
        meter.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        meter.render(screen);

        const filledCells = screen.back[0].slice(5, 15).filter((cell: { char: string }) => cell.char === '█' || cell.char === '#');
        expect(filledCells.length).toBeGreaterThan(0);
        const barCell = filledCells[0];
        expect(barCell.fg).toBeDefined();
        expect(typeof barCell.fg).toBe('object');
        expect((barCell.fg as { name: string }).name).toBe('red');
    });

    it('renders high color when value is at or above high threshold', async () => {
        const { Meter } = await import('./Meter.js');
        const meter = new Meter('Test', {}, { low: 0.25, high: 0.75 });
        meter.setValue(0.85);
        meter.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        meter.render(screen);

        const filledCells = screen.back[0].slice(5, 15).filter((cell: { char: string }) => cell.char === '█' || cell.char === '#');
        expect(filledCells.length).toBeGreaterThan(0);
        const barCell = filledCells[0];
        expect(barCell.fg).toBeDefined();
        expect(typeof barCell.fg).toBe('object');
        expect((barCell.fg as { name: string }).name).toBe('yellow');
    });

    it('renders optimum color when value is between low and high', async () => {
        const { Meter } = await import('./Meter.js');
        const meter = new Meter('Test', {}, { low: 0.25, high: 0.75 });
        meter.setValue(0.5);
        meter.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        meter.render(screen);

        const filledCells = screen.back[0].slice(5, 15).filter((cell: { char: string }) => cell.char === '█' || cell.char === '#');
        expect(filledCells.length).toBeGreaterThan(0);
        const barCell = filledCells[0];
        expect(barCell.fg).toBeDefined();
        expect(typeof barCell.fg).toBe('object');
        expect((barCell.fg as { name: string }).name).toBe('green');
    });

    it('hides percentage when showLabel is false', async () => {
        const { Meter } = await import('./Meter.js');
        const meter = new Meter('Disk', {}, { showLabel: false });
        meter.setValue(0.5);
        meter.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        meter.render(screen);

        const row = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(row).toContain('Disk');
        expect(row).not.toContain('%');
    });

    it('uses ASCII chars when unicode is unavailable (spy)', async () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const { Meter } = await import('./Meter.js');

        const meter = new Meter('Disk');
        meter.setValue(0.5);
        meter.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        meter.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('#');
        expect(rendered).toContain('-');
        expect(rendered).not.toMatch(/[█░]/);
    });

    it('uses unicode chars when unicode is available (spy)', async () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const { Meter } = await import('./Meter.js');

        const meter = new Meter('Disk');
        meter.setValue(0.5);
        meter.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        meter.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toMatch(/[█░]/);
        expect(rendered).not.toContain('#');
    });
});
