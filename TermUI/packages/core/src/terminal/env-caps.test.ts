// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for env-caps
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { caps, prefersReducedMotion } from './env-caps.js';

// caps is evaluated at module load time, so each test must:
// 1. vi.stubEnv() to set env vars
// 2. vi.resetModules() to clear the cached module
// 3. dynamically import() to get a fresh caps with the stubbed env

describe('env-caps', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('caps.color is false when NO_COLOR=1', async () => {
        vi.stubEnv('NO_COLOR', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { caps } = await import('./env-caps.js');
        expect(caps.color).toBe(false);
    });

    it('caps.unicode is false when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { caps } = await import('./env-caps.js');
        expect(caps.unicode).toBe(false);
    });

    it('caps.motion is false when CI=1', async () => {
        vi.stubEnv('CI', '1');
        vi.resetModules();
        const { caps } = await import('./env-caps.js');
        expect(caps.motion).toBe(false);
    });

    it('caps.ci is true when CI=1', async () => {
        vi.stubEnv('CI', '1');
        vi.resetModules();
        const { caps } = await import('./env-caps.js');
        expect(caps.ci).toBe(true);
    });

    it('caps.background is dark when COLORFGBG indicates a dark background', async () => {
        vi.stubEnv('COLORFGBG', '15;0');
        vi.stubEnv('TERM', 'xterm-256color');
        vi.resetModules();
        const { caps } = await import('./env-caps.js');
        expect(caps.background).toBe('dark');
    });

    it('caps.background is light when TERM_BACKGROUND=light', async () => {
        vi.stubEnv('TERM_BACKGROUND', 'light');
        vi.stubEnv('TERM', 'xterm-256color');
        vi.resetModules();
        const { caps } = await import('./env-caps.js');
        expect(caps.background).toBe('light');
    });

    it('caps.motion is false when NO_MOTION=1 and CI is unset', async () => {
        vi.stubEnv('CI', '');
        vi.stubEnv('NO_MOTION', '1');
        vi.resetModules();
        const { caps } = await import('./env-caps.js');
        expect(caps.motion).toBe(false);
        vi.unstubAllEnvs();
        vi.resetModules();
    });
});

describe('prefersReducedMotion', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns true when caps.motion is false', () => {
        const spy = vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);
        expect(prefersReducedMotion()).toBe(true);
        spy.mockRestore();
    });

    it('returns false when caps.motion is true', () => {
        const spy = vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
        expect(prefersReducedMotion()).toBe(false);
        spy.mockRestore();
    });

    it('reads caps.motion live on every call, not a cached snapshot', () => {
        const spy = vi.spyOn(caps, 'motion', 'get')
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);
        expect(prefersReducedMotion()).toBe(false); // first call: motion=true → false
        expect(prefersReducedMotion()).toBe(true);  // second call: motion=false → true
        spy.mockRestore();
    });
});
