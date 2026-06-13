import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Skeleton } from './Skeleton.js';
import * as motion from '@termuijs/motion';

describe('Skeleton', () => {
    let timerCallback: (() => void) | undefined;

    beforeEach(() => {
        timerCallback = undefined;

        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        vi.spyOn(motion, 'timerPoolSubscribe').mockImplementation((_ms, cb) => {
            timerCallback = cb;
            return () => {};
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('creates skeleton and subscribes to timer', () => {
        const s = new Skeleton();
        expect(s).toBeDefined();
        expect(motion.timerPoolSubscribe).toHaveBeenCalled();
    });

    it('renders initial state', () => {
        const s = new Skeleton();
        s.updateRect({ x: 0, y: 0, width: 5, height: 2 });

        const screen = new Screen(5, 2);
        s.render(screen);

        for (let r = 0; r < 2; r++) {
            expect(screen.back[r].map(c => c.char).join('')).toBe('░░░░░');
        }
    });

    it('updates on timer tick', () => {
        const s = new Skeleton();
        s.updateRect({ x: 0, y: 0, width: 5, height: 1 });

        const screen1 = new Screen(5, 1);
        s.render(screen1);

        if (timerCallback) timerCallback();

        const screen2 = new Screen(5, 1);
        s.render(screen2);

        expect(screen2.back[0].map(c => c.char).join('')).toBe('▒▒▒▒▒');
    });

    it('does not animate when caps.motion is false', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);

        const s = new Skeleton();
        expect(motion.timerPoolSubscribe).not.toHaveBeenCalled();
    });

    it('respects custom chars', () => {
        const s = new Skeleton({}, { chars: ['X', 'X'] });
        s.updateRect({ x: 0, y: 0, width: 3, height: 1 });

        const screen = new Screen(3, 1);
        s.render(screen);

        expect(screen.back[0].map(c => c.char).join('')).toBe('XXX');
    });


    it('unmount unsubscribes timer', () => {
        const unsub = vi.fn();

        vi.spyOn(motion, 'timerPoolSubscribe').mockReturnValue(unsub);

        const s = new Skeleton();
        s.unmount();

        expect(unsub).toHaveBeenCalled();
    });
});