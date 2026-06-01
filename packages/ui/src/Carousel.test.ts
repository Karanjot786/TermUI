import { describe, it, expect, vi, afterEach } from 'vitest';
import { Carousel } from './Carousel.js';
import { Screen, caps } from '@termuijs/core';

describe('Carousel', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts at slide 0 and exposes the current slide', () => {
        const carousel = new Carousel(['First slide', 'Second slide'], { showDots: true });
        expect(carousel.activeIndex).toBe(0);
        expect(carousel.currentSlide).toBe('First slide');
        expect(carousel.showDots).toBe(true);
    });

    it('navigates with left/right arrow keys and calls onChange', () => {
        const onChange = vi.fn();
        const carousel = new Carousel(['A', 'B', 'C'], { showDots: false, onChange });

        carousel.handleKey({ key: 'right', ctrl: false, alt: false } as any);
        expect(carousel.activeIndex).toBe(1);
        expect(onChange).toHaveBeenCalledWith(1);

        carousel.handleKey({ key: 'left', ctrl: false, alt: false } as any);
        expect(carousel.activeIndex).toBe(0);
    });

    it('wraps forward from last slide to first', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.setIndex(2);
        carousel.next();
        expect(carousel.activeIndex).toBe(0);
    });

    it('wraps backward from first slide to last', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.prev();
        expect(carousel.activeIndex).toBe(2);
    });

    it('renders slide content to screen', () => {
        const carousel = new Carousel(['Hello world', 'Second slide']);
        const screen = new Screen(20, 3);
        carousel.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        carousel.render(screen);
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('Hello world');
    });

    it('renders ASCII indicators when unicode is disabled', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const carousel = new Carousel(['Slide 1', 'Slide 2'], { showDots: true });
        const screen = new Screen(16, 2);
        carousel.updateRect({ x: 0, y: 0, width: 16, height: 2 });
        carousel.render(screen);
        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('(*)');
        expect(row1).toContain('( )');
        expect(row1).not.toContain('●');
        expect(row1).not.toContain('○');
    });
});
