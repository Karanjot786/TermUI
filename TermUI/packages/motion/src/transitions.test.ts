// ─────────────────────────────────────────────────────
// @termuijs/motion — Tests for Transitions (easing functions)
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { easings } from './transitions.js';

describe('Easing Functions', () => {
    it('linear(0) = 0 and linear(1) = 1', () => {
        expect(easings.linear(0)).toBe(0);
        expect(easings.linear(1)).toBe(1);
    });

    it('linear(0.5) = 0.5', () => {
        expect(easings.linear(0.5)).toBe(0.5);
    });

    it('easeIn starts slow (value < t for small t)', () => {
        const t = 0.3;
        expect(easings.easeIn(t)).toBeLessThan(t);
    });

    it('easeOut starts fast (value > t for small t)', () => {
        const t = 0.3;
        expect(easings.easeOut(t)).toBeGreaterThan(t);
    });

    it('easeInOut is symmetric around 0.5', () => {
        const a = easings.easeInOut(0.25);
        const b = easings.easeInOut(0.75);
        expect(a + b).toBeCloseTo(1, 5);
    });

    it('all easings return 0 at t=0 and 1 at t=1', () => {
        for (const [name, fn] of Object.entries(easings)) {
            expect(fn(0)).toBeCloseTo(0, 5);
            expect(fn(1)).toBeCloseTo(1, 5);
        }
    });
});

// caps.motion is evaluated at module load time, so each test must:
// 1. vi.stubEnv() to set NO_MOTION
// 2. vi.resetModules() to clear the cached module
// 3. dynamically import() to get a fresh module with the stubbed env

describe('transition — caps.motion=false', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('calls onFrame(easing(1)) immediately', async () => {
        vi.stubEnv('NO_MOTION', '1');
        vi.stubEnv('CI', '');
        vi.resetModules();
        const { transition, easings: e } = await import('./transitions.js');

        const frames: number[] = [];
        transition({ durationMs: 300, onFrame: v => frames.push(v) });

        // default easing is easeInOut; easeInOut(1) = 1
        expect(frames).toEqual([e.easeInOut(1)]);
    });

    it('calls onComplete immediately', async () => {
        vi.stubEnv('NO_MOTION', '1');
        vi.stubEnv('CI', '');
        vi.resetModules();
        const { transition } = await import('./transitions.js');

        let completed = false;
        transition({ durationMs: 300, onFrame: () => {}, onComplete: () => { completed = true; } });

        expect(completed).toBe(true);
    });

    it('returns a no-op cancel function', async () => {
        vi.stubEnv('NO_MOTION', '1');
        vi.stubEnv('CI', '');
        vi.resetModules();
        const { transition } = await import('./transitions.js');

        const cancel = transition({ durationMs: 300, onFrame: () => {} });
        expect(() => cancel()).not.toThrow();
    });
});

describe('pulse — caps.motion=false', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('calls onFrame(1) immediately', async () => {
        vi.stubEnv('NO_MOTION', '1');
        vi.stubEnv('CI', '');
        vi.resetModules();
        const { pulse } = await import('./transitions.js');

        const frames: number[] = [];
        pulse(1000, v => frames.push(v));

        expect(frames).toEqual([1]);
    });

    it('returns immediately without scheduling', async () => {
        vi.stubEnv('NO_MOTION', '1');
        vi.stubEnv('CI', '');
        vi.resetModules();
        const { pulse } = await import('./transitions.js');

        // Should complete synchronously — just verify it doesn't hang or throw
        const cancel = pulse(1000, () => {});
        expect(() => cancel()).not.toThrow();
    });
});
