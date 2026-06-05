import { describe, expect, it, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('LineGauge', () => {
    it('renders exactly half the bar filled at 50% when label is hidden', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', 'xterm-256color');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { LineGauge } = await import('./LineGauge.js');

        const gauge = new LineGauge({}, { showLabel: false });
        gauge.setValue(0.5);
        gauge.updateRect({ x: 0, y: 0, width: 10, height: 1 });

        const screen = new Screen(10, 1);
        gauge.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toBe('━━━━━─────');
    });

    it('renders only empty chars at 0%', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', 'xterm-256color');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { LineGauge } = await import('./LineGauge.js');

        const gauge = new LineGauge({}, { showLabel: false });
        gauge.setValue(0);
        gauge.updateRect({ x: 0, y: 0, width: 10, height: 1 });

        const screen = new Screen(10, 1);
        gauge.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toBe('──────────');
    });

    it('renders only filled chars at 100%', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', 'xterm-256color');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { LineGauge } = await import('./LineGauge.js');

        const gauge = new LineGauge({}, { showLabel: false });
        gauge.setValue(1);
        gauge.updateRect({ x: 0, y: 0, width: 10, height: 1 });

        const screen = new Screen(10, 1);
        gauge.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toBe('━━━━━━━━━━');
    });

    it('falls back to ASCII chars when unicode is unavailable', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { LineGauge } = await import('./LineGauge.js');

        const gauge = new LineGauge({}, { showLabel: false });
        gauge.setValue(0.5);
        gauge.updateRect({ x: 0, y: 0, width: 10, height: 1 });

        const screen = new Screen(10, 1);
        gauge.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('=');
        expect(rendered).toContain('-');
        expect(rendered).not.toMatch(/[━─]/);
    });

    it('calls markDirty when value changes', async () => {
        const { LineGauge } = await import('./LineGauge.js');

        const gauge = new LineGauge();
        const spy = vi.spyOn(gauge, 'markDirty');

        gauge.setValue(0.3);
        expect(spy).toHaveBeenCalled();
    });
});
