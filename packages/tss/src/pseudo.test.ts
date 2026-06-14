// ─────────────────────────────────────────────────────────────────
// @termuijs/tss – Tests for pseudo-class state matching
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { isSupportedPseudo, matchesPseudo, SUPPORTED_PSEUDO_CLASSES } from './pseudo.js';

describe('isSupportedPseudo', () => {
  it('returns true for hover', () => {
    expect(isSupportedPseudo('hover')).toBe(true);
  });

  it('returns true for focus', () => {
    expect(isSupportedPseudo('focus')).toBe(true);
  });

  it('returns true for disabled', () => {
    expect(isSupportedPseudo('disabled')).toBe(true);
  });

  it('returns false for unsupported pseudo', () => {
    expect(isSupportedPseudo('active')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSupportedPseudo('')).toBe(false);
  });
});

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

describe('SUPPORTED_PSEUDO_CLASSES', () => {
  it('contains exactly hover, focus, disabled', () => {
    expect(SUPPORTED_PSEUDO_CLASSES.has('hover')).toBe(true);
    expect(SUPPORTED_PSEUDO_CLASSES.has('focus')).toBe(true);
    expect(SUPPORTED_PSEUDO_CLASSES.has('disabled')).toBe(true);
    expect(SUPPORTED_PSEUDO_CLASSES.size).toBe(3);
  });
});