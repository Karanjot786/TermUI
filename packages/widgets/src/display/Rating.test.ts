import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Rating } from './Rating.js';

afterEach(() => {
    vi.restoreAllMocks();
});

function row(screen: Screen, y: number): string {
    return screen.back[y]
        .map(c => c.char)
        .join('');
}

describe('Rating', () => {
    it('renders rating stars', () => {
        const rating = new Rating({}, {
            value: 4,
            max: 5,
        });

        const screen = new Screen(20, 2);

        rating.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 2,
        });

        rating.render(screen);

        expect(row(screen, 0)).toContain('★★★★☆');
    });

    it('renders textual feedback when showLabel is enabled', () => {
        const rating = new Rating({}, {
            value: 4,
            max: 5,
            showLabel: true,
        });

        const screen = new Screen(20, 2);

        rating.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 2,
        });

        rating.render(screen);

        expect(row(screen, 1)).toContain('Rating: 4 / 5');
    });

    it('does not mark dirty when setValue receives the same value', () => {
        const rating = new Rating({}, {
            value: 4,
        });

        rating.clearDirty();

        rating.setValue(4);

        expect(rating.isDirty).toBe(false);
    });

    it('marks dirty when setValue receives a different value', () => {
        const rating = new Rating({}, {
            value: 4,
        });

        rating.clearDirty();

        rating.setValue(5);

        expect(rating.isDirty).toBe(true);
    });

    it('clamps values above max', () => {
        const rating = new Rating({}, {
            value: 10,
            max: 5,
        });

        const screen = new Screen(20, 1);

        rating.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 1,
        });

        rating.render(screen);

        expect(row(screen, 0)).toContain('★★★★★');
    });

    it('renders zero rating correctly', () => {
        const rating = new Rating({}, {
            value: 0,
            max: 5,
            showLabel: true,
        });

        const screen = new Screen(20, 2);

        rating.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 2,
        });

        rating.render(screen);

        expect(row(screen, 0)).toContain('☆☆☆☆☆');
        expect(row(screen, 1)).toContain('Rating: 0 / 5');
    });

    it('uses ASCII fallback when unicode is unavailable', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const rating = new Rating({}, {
            value: 3,
            max: 5,
        });

        const screen = new Screen(20, 1);

        rating.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 1,
        });

        rating.render(screen);

        expect(row(screen, 0)).toContain('***--');
    });
});