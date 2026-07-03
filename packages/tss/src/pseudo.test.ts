// ─────────────────────────────────────────────────────────────────
// @termuijs/tss – Tests for pseudo-class state matching
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { matchesPseudo } from './pseudo.js';

describe('matchesPseudo', () => {
  it('matches when selector has no pseudo (applies to all states)', () => {
    expect(matchesPseudo(undefined, undefined)).toBe(true);
    expect(matchesPseudo(undefined, 'hover')).toBe(true);
    expect(matchesPseudo(undefined, 'focus')).toBe(true);
  });

  it('matches when selector pseudo equals state pseudo', () => {
    expect(matchesPseudo('hover', 'hover')).toBe(true);
    expect(matchesPseudo('focus', 'focus')).toBe(true);
    expect(matchesPseudo('disabled', 'disabled')).toBe(true);
  });

  it('does not match when selector has pseudo but state does not', () => {
    expect(matchesPseudo('hover', undefined)).toBe(false);
    expect(matchesPseudo('focus', undefined)).toBe(false);
  });

  it('does not match when pseudos differ', () => {
    expect(matchesPseudo('hover', 'focus')).toBe(false);
    expect(matchesPseudo('disabled', 'hover')).toBe(false);
  });

  it('does not throw for unexpected string values', () => {
    expect(() => matchesPseudo('unknown', 'unknown')).not.toThrow();
  });
});