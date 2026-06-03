// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Skeleton widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Skeleton } from './Skeleton.js';
import * as motion from '@termuijs/motion';

describe('Skeleton', () => {
    let timerCallback: (() => void) | undefined;

    beforeEach(() => {
        timerCallback = undefined;
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        vi.spyOn(motion, 'timerPoolSubscribe').mockImplementation((_interval, cb) => {
            timerCallback = cb;
            return () => {};
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes with default options and subscribes to timers', () => {
        const skeleton = new Skeleton();
        expect(skeleton).toBeDefined();
        expect(motion.timerPoolSubscribe).toHaveBeenCalledWith(600, expect.any(Function));
        expect(timerCallback).toBeDefined();
    });

    it('does not subscribe to timer pool if motion is disabled', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);
        const skeleton = new Skeleton();
        expect(skeleton).toBeDefined();
        expect(motion.timerPoolSubscribe).not.toHaveBeenCalled();
    });

    it('renders pulse variant with unicode defaults', () => {
        const skeleton = new Skeleton({}, { variant: 'pulse' });
        skeleton.updateRect({ x: 0, y: 0, width: 5, height: 2 });
        const screen = new Screen(5, 2);
        skeleton.render(screen);

        // Frame 0 uses first char ('░')
        for (let row = 0; row < 2; row++) {
            const rendered = screen.back[row].map(c => c.char).join('');
            expect(rendered).toBe('░░░░░');
            for (let col = 0; col < 5; col++) {
                expect(screen.back[row][col].dim).toBe(true);
            }
        }
    });

    it('advances pulse frame and updates rendering on timer tick', () => {
        const skeleton = new Skeleton({}, { variant: 'pulse' });
        skeleton.updateRect({ x: 0, y: 0, width: 5, height: 2 });
        const screen1 = new Screen(5, 2);
        skeleton.render(screen1);
        expect(screen1.back[0].map(c => c.char).join('')).toBe('░░░░░');

        // Trigger timer tick to advance frame to 1 (uses '▒')
        if (timerCallback) timerCallback();

        const screen2 = new Screen(5, 2);
        skeleton.render(screen2);
        expect(screen2.back[0].map(c => c.char).join('')).toBe('▒▒▒▒▒');
        expect(screen2.back[0][0].dim).toBe(false);
    });

    it('renders pulse variant with ASCII fallback when unicode is disabled', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const skeleton = new Skeleton({}, { variant: 'pulse' });
        skeleton.updateRect({ x: 0, y: 0, width: 5, height: 1 });

        const screen = new Screen(5, 1);
        skeleton.render(screen);

        // ASCII default chars are ['-', '#']
        expect(screen.back[0].map(c => c.char).join('')).toBe('-----');
    });

    it('renders pulse variant with custom characters', () => {
        const skeleton = new Skeleton({}, { variant: 'pulse', chars: ['A', 'B'] });
        skeleton.updateRect({ x: 0, y: 0, width: 5, height: 1 });

        const screen1 = new Screen(5, 1);
        skeleton.render(screen1);
        expect(screen1.back[0].map(c => c.char).join('')).toBe('AAAAA');

        if (timerCallback) timerCallback();

        const screen2 = new Screen(5, 1);
        skeleton.render(screen2);
        expect(screen2.back[0].map(c => c.char).join('')).toBe('BBBBB');
    });

    it('renders shimmer variant and shifts band on timer tick', () => {
        const skeleton = new Skeleton({}, { variant: 'shimmer', chars: ['-', '#'] });
        // Width 10: shimmer band is max(1, 10 * 0.2) = 2.
        skeleton.updateRect({ x: 0, y: 0, width: 10, height: 1 });

        const screen1 = new Screen(10, 1);
        skeleton.render(screen1);
        // Initially, shimmerPos = 0, bandStart = 0, bandWidth = 2 -> indices 0 and 1 are '#'
        expect(screen1.back[0].map(c => c.char).join('')).toBe('##--------');

        // Advance shimmerPos by 1 -> bandStart = 1
        if (timerCallback) timerCallback();

        const screen2 = new Screen(10, 1);
        skeleton.render(screen2);
        expect(screen2.back[0].map(c => c.char).join('')).toBe('-##-------');
    });

    it('calls unsubscribe and clears timer on unmount', () => {
        const unsubscribeMock = vi.fn();
        vi.spyOn(motion, 'timerPoolSubscribe').mockReturnValue(unsubscribeMock);

        const skeleton = new Skeleton();
        skeleton.unmount();

        expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('does not render if dimensions are zero or negative', () => {
        const skeleton = new Skeleton();
        skeleton.updateRect({ x: 0, y: 0, width: 0, height: 0 });

        const screen = new Screen(5, 5);
        expect(() => skeleton.render(screen)).not.toThrow();
    });
});
