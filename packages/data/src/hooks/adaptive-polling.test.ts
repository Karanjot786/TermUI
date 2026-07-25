import { describe, expect, it } from 'vitest';
import { AdaptivePollingController } from './adaptive-polling.js';

describe('AdaptivePollingController', () => {
    it('skips overlapping polls and applies backpressure', () => {
        const controller = new AdaptivePollingController({ baseInterval: 100, maxInterval: 1000 });

        expect(controller.begin()).toBe(true);
        expect(controller.begin()).toBe(false);

        expect(controller.snapshot().skipped).toBe(1);
        expect(controller.nextDelay()).toBe(200);
    });

    it('backs off after failures and recovers after success', () => {
        const controller = new AdaptivePollingController({ baseInterval: 100, maxInterval: 1000 });

        controller.begin();
        controller.failure();
        expect(controller.nextDelay()).toBe(400);

        controller.begin();
        controller.success(25);
        expect(controller.nextDelay()).toBe(200);
    });

    it('caps delay at the configured maximum', () => {
        const controller = new AdaptivePollingController({ baseInterval: 100, maxInterval: 250 });

        controller.begin();
        controller.failure();
        controller.begin();
        controller.failure();

        expect(controller.nextDelay()).toBe(250);
    });
});
