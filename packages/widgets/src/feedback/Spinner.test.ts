// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Spinner widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { caps, Screen } from '@termuijs/core';
import { Spinner, SPINNER_FRAMES } from './Spinner.js';

describe('Spinner', () => {
    beforeEach(() => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not advance frames on manual tick when motion is disabled', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);
        const spinner = new Spinner({}, { spinner: 'line' });

        spinner.tick(130);

        const frameIndex = (spinner as unknown as { _frameIndex: number })._frameIndex;
        expect(frameIndex).toBe(0);
    });

    it('starts at first frame', () => {
        // Default spinner is 'dots'
        const spinner = new Spinner();
        const screen = new Screen(20, 1);
        spinner.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        spinner.render(screen);
        const row = screen.back[0].map(c => c.char).join('');
        expect(row.trim().length).toBeGreaterThan(0);
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

    it('supports variant property override', () => {
        const spinner = new Spinner({}, { variant: 'braille' });
        const interval = (spinner as unknown as { _interval: number })._interval;
        expect(interval).toBe(80);
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames[0]).toBe('⠋');
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
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const spinner = new Spinner({}, { preset: 'dots' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(['|', '/', '-', '\\']);
    });

    it('uses ASCII frames when NO_UNICODE=1 and preset is bar', async () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const spinner = new Spinner({}, { preset: 'bar' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(['[ ]', '[= ]', '[== ]', '[===]']);
    });

    it('uses ASCII frames when NO_UNICODE=1 and preset is pulse', async () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const spinner = new Spinner({}, { preset: 'pulse' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(['#', '+', '-', '.']);
    });

    it('uses ASCII frames when NO_UNICODE=1 and preset is bounce', async () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const spinner = new Spinner({}, { preset: 'bounce' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(['.', 'o', 'O', 'o']);
    });

    it('uses unicode frames when unicode is available for bar', async () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const spinner = new Spinner({}, { preset: 'bar' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(SPINNER_FRAMES.bar.frames);
    });

    it('uses unicode frames when unicode is available for pulse', async () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const spinner = new Spinner({}, { preset: 'pulse' });
        const frames = (spinner as unknown as { _frames: string[] })._frames;
        expect(frames).toEqual(SPINNER_FRAMES.pulse.frames);
    });
});

describe('Spinner — Pulse animation', () => {
    beforeEach(() => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders pulse char with dim when progress < 0.5 and bold when >= 0.5', () => {
        const spinner = new Spinner({}, { animation: 'pulse' });
        spinner.updateRect({ x: 0, y: 0, width: 20, height: 1 });

        // Force animProgress to dim range
        (spinner as unknown as { _animProgress: number })._animProgress = 0.3;
        let screen = new Screen(20, 1);
        spinner.render(screen);
        expect(screen.back[0][0].char).toBe('█');
        expect(screen.back[0][0].dim).toBe(true);
        expect(screen.back[0][0].bold).toBe(false);

        // Force animProgress to bold range
        (spinner as unknown as { _animProgress: number })._animProgress = 0.7;
        screen = new Screen(20, 1);
        spinner.render(screen);
        expect(screen.back[0][0].char).toBe('█');
        expect(screen.back[0][0].dim).toBe(false);
        expect(screen.back[0][0].bold).toBe(true);
    });

    it('renders static pulse char when motion is disabled', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);
        const spinner = new Spinner({}, { animation: 'pulse' });
        spinner.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        spinner.render(screen);
        expect(screen.back[0][0].char).toBe('█');
        expect(screen.back[0][0].dim).toBe(false);
        expect(screen.back[0][0].bold).toBe(false);
    });

    it('tick is a no-op in pulse mode', () => {
        const spinner = new Spinner({}, { animation: 'pulse' });
        (spinner as unknown as { _frameIndex: number })._frameIndex = 0;
        spinner.tick(1000);
        expect((spinner as unknown as { _frameIndex: number })._frameIndex).toBe(0);
    });

    it('uses ASCII pulse char when unicode is not available', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const spinner = new Spinner({}, { animation: 'pulse' });
        const pulseChar = (spinner as unknown as { _pulseChar: string })._pulseChar;
        expect(pulseChar).toBe('#');
    });

    it('accepts custom pulseChar', () => {
        const spinner = new Spinner({}, { animation: 'pulse', pulseChar: '●' });
        const pulseChar = (spinner as unknown as { _pulseChar: string })._pulseChar;
        expect(pulseChar).toBe('●');
    });

    it('spins frames by default when animation is not set', () => {
        const spinner = new Spinner({}, { preset: 'line' });
        const animation = (spinner as unknown as { _animation: string })._animation;
        expect(animation).toBe('spin');
    });
});
