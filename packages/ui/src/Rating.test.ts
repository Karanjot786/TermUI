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

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Rating', () => {
    it('renders 5 empty stars on init', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const rating = new Rating();
        const screen = new Screen(20, 1);
        rating.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        rating.render(screen);

        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(rendered).toContain('☆☆☆☆☆');
    });

    it('right key fills one star', () => {
        const rating = new Rating();
        expect(rating.value).toBe(0);

        rating.handleKey(key('right'));
        expect(rating.value).toBe(1);
    });

    it('left key does not go below 0', () => {
        const rating = new Rating({ value: 0 });

        rating.handleKey(key('left'));
        expect(rating.value).toBe(0);
    });

    it('enter fires onChange with current value', () => {
        const onChange = vi.fn();
        const rating = new Rating({ value: 3, onChange });

        rating.handleKey(key('enter'));
        expect(onChange).toHaveBeenCalledWith(3);
    });

    it('ASCII fallback renders - and *', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const rating = new Rating({ value: 2, max: 5 });
        const screen = new Screen(20, 1);
        rating.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        rating.render(screen);

        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(rendered).toContain('**---');
        expect(rendered).not.toMatch(/[★☆]/);
    });

    it('value setter clamps to max', () => {
        const rating = new Rating({ max: 5 });
        rating.value = 10;
        expect(rating.value).toBe(5);
    });

    it('readonly prevents key input', () => {
        const onChange = vi.fn();
        const rating = new Rating({ value: 2, readonly: true, onChange });

        rating.handleKey(key('right'));
        expect(rating.value).toBe(2);

        rating.handleKey(key('enter'));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('home key sets value to 0', () => {
        const rating = new Rating({ value: 3 });

        rating.handleKey(key('home'));
        expect(rating.value).toBe(0);
    });

    it('end key sets value to max', () => {
        const rating = new Rating({ value: 1, max: 5 });

        rating.handleKey(key('end'));
        expect(rating.value).toBe(5);
    });

    it('does not handle space key', () => {
        const rating = new Rating({ value: 2 });

        rating.handleKey(key('space'));
        expect(rating.value).toBe(2);
    });

    it('renders filled and empty unicode stars correctly', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const rating = new Rating({ value: 3, max: 5 });
        const screen = new Screen(20, 1);
        rating.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        rating.render(screen);

        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(rendered).toContain('★★★☆☆');
    });

    it('right key caps at max', () => {
        const rating = new Rating({ value: 5, max: 5 });

        rating.handleKey(key('right'));
        expect(rating.value).toBe(5);
    });

    it('respects custom max', () => {
        const rating = new Rating({ max: 10 });
        expect(rating.max).toBe(10);
    });

    it('defaults to max 5 and value 0', () => {
        const rating = new Rating();
        expect(rating.max).toBe(5);
        expect(rating.value).toBe(0);
    });

    it('focusable is true', () => {
        const rating = new Rating();
        expect(rating.focusable).toBe(true);
    });
});
