// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for env-caps
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
