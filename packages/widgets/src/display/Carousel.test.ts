// ─────────────────────────────────────────────────────────────────────────────
// @termuijs/ui — Tests for Carousel widget
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Carousel } from './Carousel.js';
import { Screen, caps } from '@termuijs/core';

describe('Carousel', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Existing tests ────────────────────────────────────────────────────────

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

    // ── 1. Empty slides fallback ──────────────────────────────────────────────

    it('does not throw when constructed with an empty array', () => {
        expect(() => new Carousel([])).not.toThrow();
    });

    it('creates a single fallback empty slide when constructed with []', () => {
        const carousel = new Carousel([]);
        expect(carousel.slides.length).toBe(1);
    });

    it('returns an empty string for currentSlide when constructed with []', () => {
        const carousel = new Carousel([]);
        expect(carousel.currentSlide).toBe('');
    });

    it('keeps activeIndex at 0 when constructed with []', () => {
        const carousel = new Carousel([]);
        expect(carousel.activeIndex).toBe(0);
    });

    // ── 2. setIndex normalization ─────────────────────────────────────────────

    it('normalizes setIndex(-1) to the last valid index', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.setIndex(-1);
        expect(carousel.activeIndex).toBe(2);
        expect(carousel.activeIndex).toBeGreaterThanOrEqual(0);
        expect(carousel.activeIndex).toBeLessThan(carousel.slides.length);
    });

    it('normalizes setIndex(-5) to a valid index without out-of-bounds access', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.setIndex(-5);
        const idx = carousel.activeIndex;
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(carousel.slides.length);
        expect(carousel.currentSlide).toBe(carousel.slides[idx]);
    });

    it('normalizes setIndex(100) to a valid index via modular wrapping', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.setIndex(100);
        const idx = carousel.activeIndex;
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(carousel.slides.length);
        expect(carousel.currentSlide).toBe(carousel.slides[idx]);
    });

    it('normalizes setIndex(999) without out-of-bounds access', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.setIndex(999);
        const idx = carousel.activeIndex;
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(carousel.slides.length);
    });

    // ── 3. setIndex does not fire onChange when index is unchanged ────────────

    it('does not call onChange when setIndex is called with the currently active index', () => {
        const onChange = vi.fn();
        const carousel = new Carousel(['A', 'B', 'C'], { onChange });
        // Already at 0; calling setIndex(0) should be a no-op
        carousel.setIndex(0);
        expect(carousel.activeIndex).toBe(0);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does not call onChange when setIndex normalises to the current active index', () => {
        const onChange = vi.fn();
        // 3 slides; setIndex(3) wraps to 0 which is already the active index
        const carousel = new Carousel(['A', 'B', 'C'], { onChange });
        carousel.setIndex(3); // 3 % 3 === 0 → same as current
        expect(carousel.activeIndex).toBe(0);
        expect(onChange).not.toHaveBeenCalled();
    });

    // ── 4. next() and prev() trigger onChange ─────────────────────────────────

    it('next() increments activeIndex and fires onChange exactly once', () => {
        const onChange = vi.fn();
        const carousel = new Carousel(['A', 'B', 'C'], { onChange });
        carousel.next();
        expect(carousel.activeIndex).toBe(1);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(1);
    });

    it('prev() decrements activeIndex and fires onChange exactly once', () => {
        const onChange = vi.fn();
        const carousel = new Carousel(['A', 'B', 'C'], { onChange });
        carousel.setIndex(2); // onChange fires once here
        onChange.mockClear();
        carousel.prev();
        expect(carousel.activeIndex).toBe(1);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(1);
    });

    // ── 5. Vim-style navigation keys ──────────────────────────────────────────

    it('h key navigates to the previous slide like left arrow', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.setIndex(2);
        carousel.handleKey({ key: 'h', ctrl: false, alt: false } as any);
        expect(carousel.activeIndex).toBe(1);
    });

    it('l key navigates to the next slide like right arrow', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.handleKey({ key: 'l', ctrl: false, alt: false } as any);
        expect(carousel.activeIndex).toBe(1);
    });

    it('h wraps backward from first slide to last', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.handleKey({ key: 'h', ctrl: false, alt: false } as any);
        expect(carousel.activeIndex).toBe(2);
    });

    it('l wraps forward from last slide to first', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        carousel.setIndex(2);
        carousel.handleKey({ key: 'l', ctrl: false, alt: false } as any);
        expect(carousel.activeIndex).toBe(0);
    });

    // ── 6. Ctrl/Alt modified vim keys are ignored ─────────────────────────────

    it('ctrl+h does not navigate and does not call onChange', () => {
        const onChange = vi.fn();
        const carousel = new Carousel(['A', 'B', 'C'], { onChange });
        carousel.handleKey({ key: 'h', ctrl: true, alt: false } as any);
        expect(carousel.activeIndex).toBe(0);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('alt+l does not navigate and does not call onChange', () => {
        const onChange = vi.fn();
        const carousel = new Carousel(['A', 'B', 'C'], { onChange });
        carousel.handleKey({ key: 'l', ctrl: false, alt: true } as any);
        expect(carousel.activeIndex).toBe(0);
        expect(onChange).not.toHaveBeenCalled();
    });

    // ── 7. Unsupported keys are ignored ──────────────────────────────────────

    it.each(['up', 'down', 'enter', 'escape', 'space', 'tab'])(
        'key "%s" leaves carousel state unchanged and does not throw',
        (key) => {
            const onChange = vi.fn();
            const carousel = new Carousel(['A', 'B', 'C'], { onChange });
            expect(() =>
                carousel.handleKey({ key, ctrl: false, alt: false } as any)
            ).not.toThrow();
            expect(carousel.activeIndex).toBe(0);
            expect(onChange).not.toHaveBeenCalled();
        }
    );

    // ── 8. slides getter returns a defensive copy ─────────────────────────────

    it('mutating the array returned by slides does not affect internal state', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        const copy = carousel.slides;
        copy.push('Injected');
        expect(carousel.slides.length).toBe(3);
        expect(carousel.slides).not.toContain('Injected');
    });

    // ── 9. Multi-line slide rendering ─────────────────────────────────────────

    it('renders each line of a multi-line slide in the correct screen row', () => {
        const slide = 'Line 1\nLine 2\nLine 3';
        const carousel = new Carousel([slide]);
        const screen = new Screen(20, 4);
        carousel.updateRect({ x: 0, y: 0, width: 20, height: 4 });
        carousel.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        const row1 = screen.back[1].map(c => c.char).join('');
        const row2 = screen.back[2].map(c => c.char).join('');
        expect(row0).toContain('Line 1');
        expect(row1).toContain('Line 2');
        expect(row2).toContain('Line 3');
    });

    // ── 10. Height clipping ───────────────────────────────────────────────────

    it('clips slide content to available height without throwing', () => {
        const manyLines = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n');
        const carousel = new Carousel([manyLines]);
        const screen = new Screen(20, 5);
        carousel.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        expect(() => carousel.render(screen)).not.toThrow();
        // Verify the widget wrote into the available rows
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('Line 0');
    });

    // ── 11. Width clipping ────────────────────────────────────────────────────

    it('clips a very long line to the screen width without throwing', () => {
        const longLine = 'X'.repeat(500);
        const carousel = new Carousel([longLine]);
        const screen = new Screen(20, 3);
        carousel.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        expect(() => carousel.render(screen)).not.toThrow();
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0.length).toBe(20);
    });

    // ── 12. Zero-width rendering ──────────────────────────────────────────────

    it('exits safely when width is 0 without throwing', () => {
        const carousel = new Carousel(['Hello']);
        const screen = new Screen(20, 5);
        carousel.updateRect({ x: 0, y: 0, width: 0, height: 5 });
        expect(() => carousel.render(screen)).not.toThrow();
    });

    // ── 13. Zero-height rendering ─────────────────────────────────────────────

    it('exits safely when height is 0 without throwing', () => {
        const carousel = new Carousel(['Hello']);
        const screen = new Screen(20, 5);
        carousel.updateRect({ x: 0, y: 0, width: 20, height: 0 });
        expect(() => carousel.render(screen)).not.toThrow();
    });

    // ── 14. Unicode dot indicators ────────────────────────────────────────────

    it('renders ● for active and ○ for inactive slides in unicode mode', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const carousel = new Carousel(['Slide 1', 'Slide 2', 'Slide 3'], { showDots: true });
        const screen = new Screen(20, 3);
        carousel.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        carousel.render(screen);
        const indicatorRow = screen.back[2].map(c => c.char).join('');
        expect(indicatorRow).toContain('●');
        expect(indicatorRow).toContain('○');
    });

    // ── 15. Dots hidden when showDots is false ────────────────────────────────

    it('does not render any dot indicators when showDots is false', () => {
        const carousel = new Carousel(['Hello', 'World'], { showDots: false });
        const screen = new Screen(20, 3);
        carousel.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        carousel.render(screen);

        for (let row = 0; row < 3; row++) {
            const content = screen.back[row].map(c => c.char).join('');
            expect(content).not.toContain('●');
            expect(content).not.toContain('○');
            expect(content).not.toContain('(*)');
        }
        // Slide content still renders
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('Hello');
    });

    // ── 16. Single slide ──────────────────────────────────────────────────────

    it('handles a single slide: navigation stays safe, wrapping is valid, content renders', () => {
        const carousel = new Carousel(['Only Slide']);

        expect(() => {
            carousel.next();
            carousel.prev();
        }).not.toThrow();
        expect(carousel.activeIndex).toBe(0);
        expect(carousel.currentSlide).toBe('Only Slide');

        const screen = new Screen(20, 3);
        carousel.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        carousel.render(screen);
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('Only Slide');
    });

    // ── 17. Repeated navigation stability ────────────────────────────────────

    it('index remains in bounds after 20 next() then 20 prev() calls', () => {
        const carousel = new Carousel(['A', 'B', 'C']);
        for (let i = 0; i < 20; i++) carousel.next();
        for (let i = 0; i < 20; i++) carousel.prev();
        const idx = carousel.activeIndex;
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(carousel.slides.length);
        expect(carousel.currentSlide).toBe(carousel.slides[idx]);
    });

    it('currentSlide always matches activeIndex after mixed navigation', () => {
        const slides = ['A', 'B', 'C', 'D', 'E'];
        const carousel = new Carousel(slides);
        carousel.next();
        carousel.next();
        carousel.prev();
        carousel.next();
        carousel.next();
        carousel.next();
        expect(carousel.currentSlide).toBe(slides[carousel.activeIndex]);
    });

    // ── 18. onChange receives correct wrapped index ───────────────────────────

    it('onChange receives 0 when next() wraps past the last slide', () => {
        const onChange = vi.fn();
        const carousel = new Carousel(['A', 'B', 'C'], { onChange });
        carousel.setIndex(2); // move to last slide
        onChange.mockClear();
        carousel.next(); // should wrap forward to 0
        expect(onChange).toHaveBeenCalledWith(0);
        expect(carousel.activeIndex).toBe(0);
    });

    it('onChange receives last index when prev() wraps backward from first slide', () => {
        const onChange = vi.fn();
        const carousel = new Carousel(['A', 'B', 'C'], { onChange });
        // already at 0
        carousel.prev(); // should wrap backward to 2
        expect(onChange).toHaveBeenCalledWith(2);
        expect(carousel.activeIndex).toBe(2);
    });
});
