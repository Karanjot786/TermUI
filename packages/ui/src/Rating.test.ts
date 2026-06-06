// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Rating widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps, createKeyEvent } from '@termuijs/core';
import { Rating } from './Rating.js';

/** Shorthand to build a KeyEvent for a given key name. */
function key(name: string) {
    return createKeyEvent({
        key: name,
        raw: Buffer.from(''),
        ctrl: false,
        alt: false,
        shift: false,
    });
}

/** Create a Rating, set its rect, and render it on a Screen. */
function renderRating(opts: ConstructorParameters<typeof Rating>[1] = {}, width = 20) {
    const rating = new Rating({}, opts);
    const screen = new Screen(width, 1);
    rating.updateRect({ x: 0, y: 0, width, height: 1 });
    rating.render(screen);
    return { rating, screen };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Rating', () => {
    it('renders 5 empty stars on init', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const { screen } = renderRating();
        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(rendered).toContain('☆☆☆☆☆');
    });

    it('right key fills one star', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const { rating, screen } = renderRating();
        expect(rating.getValue()).toBe(0);

        rating.handleKey(key('right'));
        rating.render(screen);

        expect(rating.getValue()).toBe(1);
        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(rendered).toContain('★');
    });

    it('left key does not go below 0', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const { rating, screen } = renderRating({ value: 0 });

        rating.handleKey(key('left'));
        rating.render(screen);

        expect(rating.getValue()).toBe(0);
    });

    it('enter fires onSelect with current value', () => {
        const onSelect = vi.fn();
        const { rating, screen } = renderRating({ value: 3, onSelect });

        rating.handleKey(key('enter'));
        rating.render(screen);

        expect(onSelect).toHaveBeenCalledWith(3);
    });

    it('ASCII fallback renders - and *', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderRating({ value: 2, max: 5 });
        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(rendered).toContain('**---');
        expect(rendered).not.toMatch(/[★☆]/);
    });

    it('setValue clamps to max and calls markDirty', () => {
        const { rating } = renderRating({ max: 5 });
        const spy = vi.spyOn(rating as unknown as { markDirty(): void }, 'markDirty');
        rating.setValue(10);
        expect(rating.getValue()).toBe(5);
        expect(spy).toHaveBeenCalled();
    });

    it('home key sets value to 0', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const { rating, screen } = renderRating({ value: 3 });

        rating.handleKey(key('home'));
        rating.render(screen);

        expect(rating.getValue()).toBe(0);
    });

    it('end key sets value to max', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const { rating, screen } = renderRating({ value: 1, max: 5 });

        rating.handleKey(key('end'));
        rating.render(screen);

        expect(rating.getValue()).toBe(5);
    });

    it('does not handle space key', () => {
        const { rating, screen } = renderRating({ value: 2 });

        rating.handleKey(key('space'));
        rating.render(screen);

        expect(rating.getValue()).toBe(2);
    });

    it('renders filled and empty unicode stars correctly', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const { screen } = renderRating({ value: 3, max: 5 });
        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(rendered).toContain('★★★☆☆');
    });

    it('right key caps at max', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const { rating, screen } = renderRating({ value: 5, max: 5 });

        rating.handleKey(key('right'));
        rating.render(screen);

        expect(rating.getValue()).toBe(5);
    });

    it('respects custom max', () => {
        const { rating } = renderRating({ max: 10 });
        expect(rating.max).toBe(10);
    });

    it('defaults to max 5 and value 0', () => {
        const { rating } = renderRating();
        expect(rating.max).toBe(5);
        expect(rating.getValue()).toBe(0);
    });

    it('focusable is true', () => {
        const { rating } = renderRating();
        expect(rating.focusable).toBe(true);
    });

    it('getValue returns current value', () => {
        const { rating } = renderRating({ value: 4 });
        expect(rating.getValue()).toBe(4);
    });
});
