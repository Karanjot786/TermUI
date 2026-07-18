// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Sparkline widget
// ─────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Sparkline', () => {
    it('uses ASCII spark characters when unicode is disabled', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Sparkline } = await import('./Sparkline.js');

        const sparkline = new Sparkline('Load');
        sparkline.setData([0, 1, 2, 3, 4, 5, 6, 7]);
        sparkline.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);

        sparkline.render(screen);

        const rendered = screen.back[0].map(cell => cell.char).join('');
        expect(rendered).toContain('Load 12345678');
        expect(rendered).not.toMatch(/[▁▂▃▄▅▆▇█]/);
    });

    it('renders unicode spark chars when unicode is enabled', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Sparkline } = await import('./Sparkline.js');

        const sparkline = new Sparkline('Net');
        sparkline.setData([0, 4, 7]);
        sparkline.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        sparkline.render(screen);

        const rendered = screen.back[0].map(c => c.char).join('');
        expect(rendered).toMatch(/[▁▂▃▄▅▆▇█]/);
        expect(rendered).not.toMatch(/[12345678]/);
    });

    it('label renders at the start of the row', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Sparkline } = await import('./Sparkline.js');

        const sparkline = new Sparkline('CPU');
        sparkline.setData([1, 2, 3]);
        sparkline.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        sparkline.render(screen);

        const rendered = screen.back[0].map(c => c.char).join('');
        expect(rendered.startsWith('CPU ')).toBe(true);
    });

    it('setData replaces data and marks the widget dirty', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Sparkline } = await import('./Sparkline.js');

        const sparkline = new Sparkline('IO');
        sparkline.setData([1, 2, 3]);
        sparkline.clearDirty();

        sparkline.setData([4, 5, 6]);

        expect(sparkline.isDirty).toBe(true);
    });

    it('pushValue appends a value and marks the widget dirty', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Sparkline } = await import('./Sparkline.js');

        const sparkline = new Sparkline('IO');
        sparkline.setData([1, 2, 3]);
        sparkline.clearDirty();

        sparkline.pushValue(9);

        expect(sparkline.isDirty).toBe(true);
    });

    it('showRange renders min-max label on row 1', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Sparkline } = await import('./Sparkline.js');

        const sparkline = new Sparkline('Mem', {}, { showRange: true });
        sparkline.setData([10, 50, 90]);
        sparkline.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 2);
        sparkline.render(screen);

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('10');
        expect(row1).toContain('90');
    });

    it('renders without error and blank spark area on empty data', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Sparkline } = await import('./Sparkline.js');

        const sparkline = new Sparkline('X');
        sparkline.setData([]);
        sparkline.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);

        expect(() => sparkline.render(screen)).not.toThrow();

        const rendered = screen.back[0].map(c => c.char).join('');
        expect(rendered).not.toMatch(/[▁▂▃▄▅▆▇█12345678]/);
    });

    it('marker braille renders braille characters instead of block chars', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Sparkline } = await import('./Sparkline.js');

        const sparkline = new Sparkline('Lat', {}, { marker: 'braille' });
        sparkline.setData([0, 2, 4, 6, 8, 10]);
        sparkline.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        sparkline.render(screen);

        const rendered = screen.back[0].map(c => c.char).join('');
        const hasBraille = [...rendered].some(
            ch => ch.codePointAt(0)! >= 0x2800 && ch.codePointAt(0)! <= 0x28ff,
        );
        expect(hasBraille).toBe(true);
        expect(rendered).not.toMatch(/[▁▂▃▄▅▆▇█]/);
    });
});
