import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateThemeName } from '../../../scripts/install-theme.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('scripts/install-theme validateThemeName (regression)', () => {
  it('allows supported themes', () => {
    expect(() => validateThemeName('dark')).not.toThrow();
  });

  it('rejects unsupported themes with message', () => {
    expect(() => validateThemeName('hacker')).toThrow('Unsupported theme: hacker');
  });
});
