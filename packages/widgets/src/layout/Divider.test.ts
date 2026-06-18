// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Divider widget
// ─────────────────────────────────────────────────────
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Divider', () => {
    it('renders a horizontal line by default', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Divider } = await import('./Divider.js');

        const divider = new Divider();
        divider.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        divider.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('─');
    });

    it('renders ASCII fallback when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Divider } = await import('./Divider.js');

        const divider = new Divider();
        divider.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        divider.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('-');
        expect(rendered).not.toContain('─');
    });

    it('renders a vertical line when orientation is vertical', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Divider } = await import('./Divider.js');

        const divider = new Divider({}, { orientation: 'vertical' });
        divider.updateRect({ x: 0, y: 0, width: 1, height: 5 });
        const screen = new Screen(1, 5);
        divider.render(screen);

        for (let row = 0; row < 5; row++) {
            const char = screen.back[row][0].char;
            expect(char).toBe('│');
        }
    });

    it('renders vertical ASCII fallback when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Divider } = await import('./Divider.js');

        const divider = new Divider({}, { orientation: 'vertical' });
        divider.updateRect({ x: 0, y: 0, width: 1, height: 3 });
        const screen = new Screen(1, 3);
        divider.render(screen);

        for (let row = 0; row < 3; row++) {
            expect(screen.back[row][0].char).toBe('|');
        }
    });

    it('renders a centered label in horizontal mode', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Divider } = await import('./Divider.js');

        const divider = new Divider({}, { label: 'Stats' });
        divider.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        divider.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('Stats');
        expect(rendered).toContain('─');
    });

    it('uses custom char when provided', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Divider } = await import('./Divider.js');

        const divider = new Divider({}, { char: '=' });
        divider.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        divider.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('=');
        expect(rendered).not.toContain('─');
    });

    it('setLabel updates the label', async () => {
        vi.resetModules();
        const { Divider } = await import('./Divider.js');
        const divider = new Divider();
        divider.setLabel('New Label');
        expect(divider).toBeDefined();
    });

    it('returns early when width is zero', async () => {
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Divider } = await import('./Divider.js');

        const divider = new Divider();
        divider.updateRect({ x: 0, y: 0, width: 0, height: 1 });
        const screen = new Screen(10, 1);
        expect(() => divider.render(screen)).not.toThrow();
    });
});