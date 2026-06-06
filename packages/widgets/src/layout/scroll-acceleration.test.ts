import { describe, it, expect } from 'vitest';
import { createVirtualClock } from '../../../testing/src/index.js';
import { ScrollAcceleration } from './scroll-acceleration.js';

describe('ScrollAcceleration', () => {
    it('returns roughly 1x for slow scrolling', () => {
        const clock = createVirtualClock();
        const accel = new ScrollAcceleration();

        accel.getMultiplier(clock.now());

        clock.advance(500);

        expect(
            accel.getMultiplier(clock.now())
        ).toBe(1);
    });

    it('returns higher multiplier for fast scrolling', () => {
        const clock = createVirtualClock();
        const accel = new ScrollAcceleration();

        accel.getMultiplier(clock.now());

        clock.advance(10);

        expect(
            accel.getMultiplier(clock.now())
        ).toBeGreaterThanOrEqual(4);
    });
});
