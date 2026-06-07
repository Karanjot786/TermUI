import { describe, it, expect, vi, afterEach } from 'vitest';
import type { KeyEvent } from '@termuijs/core';

function makeKey(key: string): KeyEvent {
    return {
        key,
        shift: false,
        ctrl: false,
        alt: false,
        raw: Buffer.alloc(0),
        stopPropagation: () => {},
        preventDefault: () => {},
    };
}

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

    it('handleKey navigates with arrow keys', async () => {
        const { Carousel } = await import('./Carousel.js');
        const c = new Carousel(['A', 'B', 'C']);
        c.handleKey(makeKey('right'));
        expect(c.getIndex()).toBe(1);
        c.handleKey(makeKey('left'));
        expect(c.getIndex()).toBe(0);
    });

    it('handleKey navigates with h and l keys', async () => {
        const { Carousel } = await import('./Carousel.js');
        const c = new Carousel(['A', 'B', 'C']);
        c.handleKey(makeKey('l'));
        expect(c.getIndex()).toBe(1);
        c.handleKey(makeKey('l'));
        expect(c.getIndex()).toBe(2);
        c.handleKey(makeKey('h'));
        expect(c.getIndex()).toBe(1);
    });

    it('setItems clamps index when new list is shorter', async () => {
        const { Carousel } = await import('./Carousel.js');
        const c = new Carousel(['A', 'B', 'C']);
        c.setIndex(2);
        c.setItems(['X', 'Y']);
        expect(c.getIndex()).toBe(1);
    });

    it('setItems preserves a still-valid index', async () => {
        const { Carousel } = await import('./Carousel.js');
        const c = new Carousel(['A', 'B']);
        c.setIndex(1);
        c.setItems(['X', 'Y', 'Z']);
        expect(c.getIndex()).toBe(1);
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

        const row = screen.getLine(0);
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

        const dotsRow = screen.getLine(1);
        expect(dotsRow).toContain('●');
        expect(dotsRow).toContain('○');
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

        const dotsRow = screen.getLine(1);
        expect(dotsRow).toContain('*');
        expect(dotsRow).toContain('.');
    });
});
