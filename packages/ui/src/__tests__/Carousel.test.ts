import { describe, it, expect, vi } from 'vitest';
import { Carousel } from '../Carousel.js';
import { caps } from '@termuijs/core';

const createScreen = () => {
    const output: Record<number, string> = {};
    return {
        writeString(x: number, y: number, text: string) {
            output[y] = text;
        },
        getOutput() {
            return output;
        },
    } as const;
};

describe('Carousel', () => {
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

    it('renders ASCII indicators when unicode is disabled', () => {
        const originalUnicode = caps.unicode;
        Object.assign(caps, { unicode: false });
        try {
            const carousel = new Carousel(['Slide 1', 'Slide 2'], { showDots: true });
            (carousel as any)._rect = { x: 0, y: 0, width: 16, height: 2 };
            const screen = createScreen();

            carousel._renderSelf(screen as any);
            const output = screen.getOutput();
            expect(output[1]).toContain('(*)');
            expect(output[1]).toContain('( )');
            expect(output[1]).not.toContain('●');
            expect(output[1]).not.toContain('○');
        } finally {
            Object.assign(caps, { unicode: originalUnicode });
        }
    });
});
