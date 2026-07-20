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
});
