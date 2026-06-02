import { describe, it, expect } from 'vitest';
import { defaultDark } from './tokens.js';
import { getNamedTheme, highContrastTheme, NAMED_THEMES } from './named-themes.js';

describe('Named ThemeTokens', () => {
  it('registers highContrast in the named theme map', () => {
    expect(NAMED_THEMES.highContrast).toBe(highContrastTheme);
    expect(getNamedTheme('highContrast')).toBe(highContrastTheme);
  });

  it('highContrast exposes all ThemeTokens with strong terminal contrast', () => {
    expect(highContrastTheme).toEqual({
      bg: '#000000',
      fg: '#ffffff',
      primary: '#00ffff',
      secondary: '#ff00ff',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff5555',
      muted: '#b3b3b3',
      border: '#ffffff',
      highlight: '#1a1a1a',
    });
  });

  it('falls back to defaultDark for unknown named themes', () => {
    expect(getNamedTheme('missing-theme')).toBe(defaultDark);
  });
});
