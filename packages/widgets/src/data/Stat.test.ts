import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Stat', () => {
    it('renders label and value on consecutive rows', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Stat } = await import('./Stat.js');

        const stat = new Stat('Label', 'Value');
        stat.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 3);
        stat.render(screen);

        const row0 = screen.back[0].map((c: { char: string }) => c.char).join('').trimEnd();
        const row1 = screen.back[1].map((c: { char: string }) => c.char).join('').trimEnd();
        expect(row0).toBe('Label');
        expect(row1).toBe('Value');
    });

    it('setValue updates rendered output', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Stat } = await import('./Stat.js');

        const stat = new Stat('Label', 'Value');
        stat.setValue('NewValue');
        stat.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 3);
        stat.render(screen);

        const row1 = screen.back[1].map((c: { char: string }) => c.char).join('').trimEnd();
        expect(row1).toBe('NewValue');
    });

    it('positive delta shows up arrow', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Stat } = await import('./Stat.js');

        const stat = new Stat('Label', 'Value', {}, { delta: 5 });
        stat.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 3);
        stat.render(screen);

        const row1 = screen.back[1].map((c: { char: string }) => c.char).join('').trimEnd();
        expect(row1).toContain('\u2191');
    });

    it('negative delta shows down arrow', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Stat } = await import('./Stat.js');

        const stat = new Stat('Label', 'Value', {}, { delta: -3 });
        stat.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 3);
        stat.render(screen);

        const row1 = screen.back[1].map((c: { char: string }) => c.char).join('').trimEnd();
        expect(row1).toContain('\u2193');
    });

    it('zero delta shows right arrow', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Stat } = await import('./Stat.js');

        const stat = new Stat('Label', 'Value', {}, { delta: 0 });
        stat.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 3);
        stat.render(screen);

        const row1 = screen.back[1].map((c: { char: string }) => c.char).join('').trimEnd();
        expect(row1).toContain('\u2192');
    });
});
