// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Spinner widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { caps } from '@termuijs/core';
import { Spinner, SPINNER_FRAMES } from './Spinner.js';

describe('Spinner', () => {
    const originalMotion = caps.motion;
    const originalUnicode = caps.unicode;

    afterEach(() => {
        (caps as unknown as { motion: boolean }).motion = originalMotion;
        (caps as unknown as { unicode: boolean }).unicode = originalUnicode;
    });

    it('does not advance frames on manual tick when motion is disabled', () => {
        (caps as unknown as { motion: boolean }).motion = false;
        const spinner = new Spinner({}, { spinner: 'line' });

        spinner.tick(130);

        const frameIndex = (spinner as unknown as { _frameIndex: number })._frameIndex;
        expect(frameIndex).toBe(0);
    });

    it('starts at first frame', () => {
        // Default spinner is 'dots'
        const spinner = new Spinner();
        expect(spinner).toBeDefined();
        const frameIndex = (spinner as unknown as { _frameIndex: number })._frameIndex;
        expect(frameIndex).toBe(0);
    });

    it('tick advances frame after interval', () => {
        const spinner = new Spinner({}, { spinner: 'line' }); // line interval=130ms
        // First tick below interval — no change
        spinner.tick(50);
        expect((spinner as unknown as { _frameIndex: number })._frameIndex).toBe(0);

        // tick past interval to advance
        spinner.tick(100); // total 150ms >= 130ms
        expect((spinner as unknown as { _frameIndex: number })._frameIndex).toBe(1);
    });

    it('setLabel updates the label', () => {
        const spinner = new Spinner({}, { label: 'Loading' });
        spinner.setLabel('Done');
        const label = (spinner as unknown as { _label: string })._label;
        expect(label).toBe('Done');
    });

    it('accepts custom frame sequences', () => {
        const spinner = new Spinner({}, {
            spinner: { frames: ['A', 'B', 'C'], interval: 50 },
        });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        const interval = (spinner as unknown as { _interval: number })._interval;
        expect(frames).toEqual(['A', 'B', 'C']);
        expect(interval).toBe(50);
    });

    it('supports preset property override', () => {
        const spinner = new Spinner({}, { preset: 'bounce' });
        const interval = (spinner as unknown as { _interval: number })._interval;
        expect(interval).toBe(120);
    });

    it('supports custom interval overrides', () => {
        const spinner = new Spinner({}, { preset: 'dots', interval: 200 });
        const interval = (spinner as unknown as { _interval: number })._interval;
        expect(interval).toBe(200);
    });

    it('supports controlled active state and doneText setter', () => {
        const spinner = new Spinner({}, { label: 'Working', active: false, doneText: '✓ Done' });
        const active = (spinner as unknown as { _active: boolean })._active;
        const doneText = (spinner as unknown as { _doneText: string })._doneText;
        expect(active).toBe(false);
        expect(doneText).toBe('✓ Done');

        spinner.setActive(true);
        expect((spinner as unknown as { _active: boolean })._active).toBe(true);

        spinner.setDoneText('Finished!');
        expect((spinner as unknown as { _doneText: string })._doneText).toBe('Finished!');
    });
});

describe('Spinner — Presets and ASCII fallback', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('uses ASCII frames when NO_UNICODE=1 and preset is dots', async () => {
        (caps as unknown as { unicode: boolean }).unicode = false;
        const spinner = new Spinner({}, { preset: 'dots' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(['|', '/', '-', '\\']);
    });

    it('uses ASCII frames when NO_UNICODE=1 and preset is bar', async () => {
        (caps as unknown as { unicode: boolean }).unicode = false;
        const spinner = new Spinner({}, { preset: 'bar' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(['[ ]', '[= ]', '[== ]', '[===]']);
    });

    it('uses ASCII frames when NO_UNICODE=1 and preset is pulse', async () => {
        (caps as unknown as { unicode: boolean }).unicode = false;
        const spinner = new Spinner({}, { preset: 'pulse' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(['#', '+', '-', '.']);
    });

    it('uses ASCII frames when NO_UNICODE=1 and preset is bounce', async () => {
        (caps as unknown as { unicode: boolean }).unicode = false;
        const spinner = new Spinner({}, { preset: 'bounce' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(['.', 'o', 'O', 'o']);
    });

    it('uses unicode frames when unicode is available for bar', async () => {
        (caps as unknown as { unicode: boolean }).unicode = true;
        const spinner = new Spinner({}, { preset: 'bar' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(SPINNER_FRAMES.bar.frames);
    });

    it('uses unicode frames when unicode is available for pulse', async () => {
        (caps as unknown as { unicode: boolean }).unicode = true;
        const spinner = new Spinner({}, { preset: 'pulse' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(SPINNER_FRAMES.pulse.frames);
    });
});
