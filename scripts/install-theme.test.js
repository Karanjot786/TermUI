import { describe, it, expect } from 'vitest';
import { validateThemeName } from './install-theme.js';

describe('validateThemeName', () => {
  it('allows supported themes', () => {
    expect(() => validateThemeName('dark')).not.toThrow();
  });

  it('rejects unsupported themes', () => {
    expect(() => validateThemeName('hacker')).toThrow(
      'Unsupported theme: hacker'
    );
  });
});
