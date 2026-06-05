import { describe, it, expect, vi, afterEach } from 'vitest';
import { caps } from '@termuijs/core';
import {
    SPRING_PRESETS,
    springPreset,
    animateSpring,
} from './spring.js';

describe('springPreset', () => {
    it('returns config for a named preset', () => {
        expect(springPreset('gentle')).toEqual(SPRING_PRESETS.gentle);
    });

    it('returns a copy not the shared object', () => {
        const preset = springPreset('gentle');

        preset.tension = 999;

        expect(SPRING_PRESETS.gentle.tension).not.toBe(999);
    });

    it('unknown preset falls back to default', () => {
        expect(
            springPreset('unknown' as any),
        ).toEqual(SPRING_PRESETS.default);
    });
});

describe('animateSpring preset support', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('accepts a preset name', () => {
        const onFrame = vi.fn();
    
        expect(() => {
            const cancel = animateSpring(0, 1, 'stiff', onFrame);
            cancel();
        }).not.toThrow();
    });

    it('no-motion path jumps to target', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);

        const onFrame = vi.fn();
        const onComplete = vi.fn();

        animateSpring(
            0,
            100,
            'gentle',
            onFrame,
            onComplete,
        );

        expect(onFrame).toHaveBeenCalledWith(100);
        expect(onComplete).toHaveBeenCalled();
    });
});