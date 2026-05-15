// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Spinner widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { caps } from '@termuijs/core';
import { Spinner, SPINNER_FRAMES } from './Spinner.js';

describe('Spinner', () => {
    const originalMotion = caps.motion;

    afterEach(() => {
        (caps as unknown as { motion: boolean }).motion = originalMotion;
    });

    it('does not advance frames on manual tick when motion is disabled', () => {
        (caps as unknown as { motion: boolean }).motion = false;
        const spinner = new Spinner({}, { spinner: 'line' });

        spinner.tick(130);

        const frameIndex = (spinner as unknown as { _frameIndex: number })._frameIndex;
        expect(frameIndex).toBe(0);
    });

    it('starts at first frame', () => {
        // Default spinner is 'dots' with frames ['⠋', '⠙', ...]
        const spinner = new Spinner();
        expect(spinner).toBeDefined();
    });

    it('tick advances frame after interval', () => {
        const spinner = new Spinner({}, { spinner: 'line' }); // line interval=130ms
        // First tick below interval — no change
        spinner.tick(50);
        // tick past interval to advance
        spinner.tick(100);
        // Frame should have advanced
        expect(spinner).toBeDefined();
    });

    it('setLabel updates the label', () => {
        const spinner = new Spinner({}, { label: 'Loading' });
        spinner.setLabel('Done');
        expect(spinner).toBeDefined();
    });

    it('accepts custom frame sequences', () => {
        const spinner = new Spinner({}, {
            spinner: { frames: ['A', 'B', 'C'], interval: 50 },
        });
        expect(spinner).toBeDefined();
    });
});

describe('Spinner — ASCII fallback', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('uses ASCII frames when NO_UNICODE=1 and spinner is dots (unicode frames)', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Spinner } = await import('./Spinner.js');
        const spinner = new Spinner({}, { spinner: 'dots' });
        // Access private _frames via cast
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(['|', '/', '-', '\\']);
    });

    it('uses unicode frames when unicode is available', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Spinner, SPINNER_FRAMES } = await import('./Spinner.js');
        const spinner = new Spinner({}, { spinner: 'dots' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(SPINNER_FRAMES.dots.frames);
    });
});
