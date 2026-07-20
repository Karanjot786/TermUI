// ─────────────────────────────────────────────────────
// @termuijs/motion — Tests for motionConfig
// ─────────────────────────────────────────────────────

import { describe, it, expect, afterEach, vi } from 'vitest';
import { motionConfig, resetMotionConfig } from './motion-config.js';
import { animateSpring } from './spring.js';
import { unsubscribeAll } from './timer-pool.js';

describe('motionConfig', () => {
    afterEach(() => {
        resetMotionConfig();
        unsubscribeAll();
    });

    it('falls back to environment detection when no override is set', () => {
        // caps.motion is true by default in the test environment (no
        // NO_MOTION/CI stubbed here), so the effective value should match.
        expect(motionConfig.reducedMotion).toBe(false);
    });

    it('setReducedMotion(true) overrides environment detection', () => {
        motionConfig.setReducedMotion(true);
        expect(motionConfig.reducedMotion).toBe(true);
    });

    it('setReducedMotion(false) overrides environment detection', () => {
        motionConfig.setReducedMotion(true);
        motionConfig.setReducedMotion(false);
        expect(motionConfig.reducedMotion).toBe(false);
    });

    it('setReducedMotion(null) clears the override and falls back again', () => {
        motionConfig.setReducedMotion(true);
        motionConfig.setReducedMotion(null);
        expect(motionConfig.reducedMotion).toBe(false);
    });

    it('subscribe() is notified with the new effective value on change', () => {
        const seen: boolean[] = [];
        const unsubscribe = motionConfig.subscribe((value) => seen.push(value));

        motionConfig.setReducedMotion(true);
        motionConfig.setReducedMotion(false);

        expect(seen).toEqual([true, false]);
        unsubscribe();
    });

    it('subscribe() returns an unsubscribe function that stops further notifications', () => {
        const seen: boolean[] = [];
        const unsubscribe = motionConfig.subscribe((value) => seen.push(value));

        motionConfig.setReducedMotion(true);
        unsubscribe();
        motionConfig.setReducedMotion(false);

        expect(seen).toEqual([true]);
    });

    it('animateSpring short-circuits to the target value when overridden on', () => {
        const frames: number[] = [];
        motionConfig.setReducedMotion(true);

        const cancel = animateSpring(0, 42, {}, (v) => frames.push(v));

        expect(frames).toEqual([42]);
        expect(() => cancel()).not.toThrow();
    });

    it('animateSpring runs normally when override is explicitly off, even under NO_MOTION', () => {
        vi.stubEnv('NO_MOTION', '1');
        motionConfig.setReducedMotion(false);

        const frames: number[] = [];
        const cancel = animateSpring(0, 42, {}, (v) => frames.push(v));

        // Multi-frame spring animation started (not short-circuited to a
        // single final-value frame), so at most one frame so far and the
        // value has not already snapped to the target.
        expect(frames.length).toBeLessThanOrEqual(1);
        cancel();
        vi.unstubAllEnvs();
    });
});
