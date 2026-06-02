import { describe, it, expect } from 'vitest';
import { defaultDark } from './tokens.js';
import {
  getNamedTheme,
  highContrastTheme,
  catppuccinTheme,
  NAMED_THEMES,
} from './named-themes.js';

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

  it('registers catppuccin in the named theme map', () => {
    expect(NAMED_THEMES.catppuccin).toBe(catppuccinTheme);
    expect(getNamedTheme('catppuccin')).toBe(catppuccinTheme);
  });

  it('catppuccin exposes the official Catppuccin palette', () => {
    expect(catppuccinTheme).toEqual({
      bg: '#1e1e2e',
      fg: '#cdd6f4',
      primary: '#cba6f7',
      secondary: '#f5c2e7',
      success: '#a6e3a1',
      warning: '#f9e2af',
      error: '#f38ba8',
      muted: '#585b70',
      border: '#585b70',
      highlight: '#313244',
    });
  });

  it('falls back to defaultDark for unknown named themes', () => {
    expect(getNamedTheme('missing-theme')).toBe(defaultDark);
  });
});
