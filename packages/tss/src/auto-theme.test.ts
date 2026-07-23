// packages/tss/src/auto-theme.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectTerminalBackground } from './auto-theme.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Set env vars for a test and restore them in afterEach.
 * Returns a cleanup function (also called automatically by afterEach).
 */
function withEnv(vars: Record<string, string | undefined>): () => void {
  const originals: Record<string, string | undefined> = {}

  for (const [key, value] of Object.entries(vars)) {
    originals[key] = process.env[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return () => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('detectTerminalBackground', () => {
  let restoreEnv: () => void

  afterEach(() => {
    restoreEnv?.()
    vi.restoreAllMocks()
  })

  // ── Strategy 1: TERM_BACKGROUND override ─────────────────────────────────

  describe('Strategy 1: TERM_BACKGROUND env override', () => {
    it('returns dark when TERM_BACKGROUND=dark', async () => {
      restoreEnv = withEnv({
        TERM_BACKGROUND: 'dark',
        COLORFGBG: undefined,
        TERM_PROGRAM: undefined,
      })
      expect(await detectTerminalBackground()).toBe('dark')
    })

    it('returns light when TERM_BACKGROUND=light', async () => {
      restoreEnv = withEnv({
        TERM_BACKGROUND: 'light',
        COLORFGBG: undefined,
        TERM_PROGRAM: undefined,
      })
      expect(await detectTerminalBackground()).toBe('light')
    })

    it('ignores COLORFGBG when TERM_BACKGROUND is set', async () => {
      restoreEnv = withEnv({
        TERM_BACKGROUND: 'light',
        COLORFGBG: '15;0',   // would indicate dark if Strategy 2 ran first
        TERM_PROGRAM: undefined,
      })
      // Strategy 1 takes priority — must return light, not dark
      expect(await detectTerminalBackground()).toBe('light')
    })
  })

  // ── Strategy 2: COLORFGBG ─────────────────────────────────────────────────

  describe('Strategy 2: COLORFGBG', () => {
    beforeEach(() => {
      restoreEnv = withEnv({
        TERM_BACKGROUND: undefined,  // Strategy 1 must not fire
        TERM_PROGRAM: undefined,     // Strategy 3 must not fire
      })
    })

    it('returns dark for COLORFGBG=15;0 (white text on black bg)', async () => {
      process.env['COLORFGBG'] = '15;0'
      expect(await detectTerminalBackground()).toBe('dark')
    })

    it('returns dark for COLORFGBG=7;0', async () => {
      process.env['COLORFGBG'] = '7;0'
      expect(await detectTerminalBackground()).toBe('dark')
    })

    it('returns light for COLORFGBG=0;15 (black text on white bg)', async () => {
      process.env['COLORFGBG'] = '0;15'
      expect(await detectTerminalBackground()).toBe('light')
    })

    it('returns light for COLORFGBG=0;7', async () => {
      process.env['COLORFGBG'] = '0;7'
      expect(await detectTerminalBackground()).toBe('light')
    })

    it('falls through to Strategy 3 when COLORFGBG is not set', async () => {
      process.env['COLORFGBG'] = undefined as unknown as string
      delete process.env['COLORFGBG']

      // With no TERM_PROGRAM either, should eventually reach unknown
      const result = await detectTerminalBackground()
      // May be 'unknown' or whatever Strategy 3/4 returns in CI
      expect(['dark', 'light', 'unknown']).toContain(result)
    })
  })

  // ── Strategy 3: TERM_PROGRAM ──────────────────────────────────────────────

  describe('Strategy 3: TERM_PROGRAM heuristics', () => {
    beforeEach(() => {
      restoreEnv = withEnv({
        TERM_BACKGROUND: undefined,
        COLORFGBG: undefined,
      })
    })

    it('returns dark for TERM_PROGRAM=vscode', async () => {
      process.env['TERM_PROGRAM'] = 'vscode'
      expect(await detectTerminalBackground()).toBe('dark')
    })

    it('returns dark for TERM_PROGRAM=iTerm.app with default dark profile', async () => {
      process.env['TERM_PROGRAM'] = 'iTerm.app'
      process.env['ITERM_PROFILE'] = 'Default'
      expect(await detectTerminalBackground()).toBe('dark')
    })

    it('returns light for TERM_PROGRAM=iTerm.app with Solarized Light profile', async () => {
      process.env['TERM_PROGRAM'] = 'iTerm.app'
      process.env['ITERM_PROFILE'] = 'Solarized Light'
      expect(await detectTerminalBackground()).toBe('light')
    })

    it('returns light for TERM_PROGRAM=iTerm.app with a profile named "Light"', async () => {
      process.env['TERM_PROGRAM'] = 'iTerm.app'
      process.env['ITERM_PROFILE'] = 'My Light Theme'
      expect(await detectTerminalBackground()).toBe('light')
    })

    it('returns dark for TERM_PROGRAM=iTerm.app with no ITERM_PROFILE set', async () => {
      process.env['TERM_PROGRAM'] = 'iTerm.app'
      delete process.env['ITERM_PROFILE']
      expect(await detectTerminalBackground()).toBe('dark')
    })
  })

  // ── Strategy 4: OSC 11 ────────────────────────────────────────────────────

  describe('Strategy 4: OSC 11 terminal query (mocked)', () => {
    beforeEach(() => {
      restoreEnv = withEnv({
        TERM_BACKGROUND: undefined,
        COLORFGBG: undefined,
        TERM_PROGRAM: undefined,
      })
    })

    it('returns unknown when OSC 11 is not supported (stdout not a TTY in test env)', async () => {
      // In a Vitest test environment, process.stdout.isTTY is false.
      // Strategy 4 is gated on isTTY — so it must skip and return 'unknown'.
      const result = await detectTerminalBackground()
      expect(result).toBe('unknown')
    })
  })

  // ── General guarantees ─────────────────────────────────────────────────────

  describe('general guarantees', () => {
    it('always returns one of the three valid values', async () => {
      const result = await detectTerminalBackground()
      expect(['dark', 'light', 'unknown']).toContain(result)
    })

    it('does not throw for any combination of unset env vars', async () => {
      restoreEnv = withEnv({
        TERM_BACKGROUND: undefined,
        COLORFGBG: undefined,
        TERM_PROGRAM: undefined,
        ITERM_PROFILE: undefined,
      })
      await expect(detectTerminalBackground()).resolves.not.toThrow()
    })
  })
})