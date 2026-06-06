import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); });

describe('Carousel', () => {
    it('constructs with index 0', async () => {
        const { Carousel } = await import('./Carousel.js');
        expect(new Carousel(['A', 'B', 'C']).getIndex()).toBe(0);
    });

    it('next and prev work', async () => {
        const { Carousel } = await import('./Carousel.js');
        const c = new Carousel(['A', 'B', 'C']);
        c.next(); expect(c.getIndex()).toBe(1);
        c.prev(); expect(c.getIndex()).toBe(0);
    });

    it('loop wraps', async () => {
        const { Carousel } = await import('./Carousel.js');
        const c = new Carousel(['A', 'B'], {}, { loop: true });
        c.prev(); expect(c.getIndex()).toBe(1);
        c.next(); expect(c.getIndex()).toBe(0);
    });

    it('non-loop stops at ends', async () => {
        const { Carousel } = await import('./Carousel.js');
        const c = new Carousel(['A', 'B']);
        c.prev(); expect(c.getIndex()).toBe(0);
        c.setIndex(1); c.next(); expect(c.getIndex()).toBe(1);
    });

    it('renders header with item text in ASCII mode', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Carousel } = await import('./Carousel.js');

        const c = new Carousel(['Hello', 'World'], {}, { showArrows: true, showDots: false });
        c.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        c.render(screen);

        const row = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(row).toContain('Hello');
        expect(row).toContain('<');
        expect(row).toContain('>');
    });

    it('renders dots row in unicode mode', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Carousel } = await import('./Carousel.js');

        const c = new Carousel(['A', 'B', 'C'], {}, { showDots: true });
        c.setIndex(1);
        c.updateRect({ x: 0, y: 0, width: 40, height: 2 });
        const screen = new Screen(40, 2);
        c.render(screen);

        const dotsRow = screen.back[1].map((cell: { char: string }) => cell.char).join('');
        expect(dotsRow).toContain('●'); // active dot
        expect(dotsRow).toContain('○'); // inactive dot
    });

    it('renders ASCII dots when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Carousel } = await import('./Carousel.js');

        const c = new Carousel(['A', 'B'], {}, { showDots: true });
        c.updateRect({ x: 0, y: 0, width: 40, height: 2 });
        const screen = new Screen(40, 2);
        c.render(screen);

        const dotsRow = screen.back[1].map((cell: { char: string }) => cell.char).join('');
        expect(dotsRow).toContain('*');
        expect(dotsRow).toContain('.');
    });
});