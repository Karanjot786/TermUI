// ─────────────────────────────────────────────────────
// Named ThemeTokens — 8 curated color schemes
// ─────────────────────────────────────────────────────

import type { ThemeTokens } from './tokens.js';
import { defaultDark } from './tokens.js';

export const draculaTheme: ThemeTokens = {
  bg: '#282a36',
  fg: '#f8f8f2',
  primary: '#bd93f9',
  secondary: '#ff79c6',
  success: '#50fa7b',
  warning: '#f1fa8c',
  error: '#ff5555',
  muted: '#6272a4',
  border: '#6272a4',
  highlight: '#44475a',
};

export const nordTheme: ThemeTokens = {
  bg: '#2e3440',
  fg: '#eceff4',
  primary: '#88c0d0',
  secondary: '#81a1c1',
  success: '#a3be8c',
  warning: '#ebcb8b',
  error: '#bf616a',
  muted: '#4c566a',
  border: '#4c566a',
  highlight: '#3b4252',
};

export const catppuccinTheme: ThemeTokens = {
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
};

export const monokaiTheme: ThemeTokens = {
  bg: '#272822',
  fg: '#f8f8f2',
  primary: '#66d9e8',
  secondary: '#a6e22e',
  success: '#a6e22e',
  warning: '#e6db74',
  error: '#f92672',
  muted: '#75715e',
  border: '#49483e',
  highlight: '#3e3d32',
};

export const solarizedTheme: ThemeTokens = {
  bg: '#002b36',
  fg: '#839496',
  primary: '#268bd2',
  secondary: '#2aa198',
  success: '#859900',
  warning: '#b58900',
  error: '#dc322f',
  muted: '#586e75',
  border: '#586e75',
  highlight: '#073642',
};

export const tokyoNightTheme: ThemeTokens = {
  bg: '#1a1b26',
  fg: '#a9b1d6',
  primary: '#7aa2f7',
  secondary: '#bb9af7',
  success: '#9ece6a',
  warning: '#e0af68',
  error: '#f7768e',
  muted: '#565f89',
  border: '#3b3d57',
  highlight: '#1f2335',
};

export const oneDarkTheme: ThemeTokens = {
  bg: '#282c34',
  fg: '#abb2bf',
  primary: '#61afef',
  secondary: '#c678dd',
  success: '#98c379',
  warning: '#e5c07b',
  error: '#e06c75',
  muted: '#5c6370',
  border: '#3e4451',
  highlight: '#2c313a',
};

export const highContrastTheme: ThemeTokens = {
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
};

export const NAMED_THEMES: Record<string, ThemeTokens> = {
  dracula: draculaTheme,
  nord: nordTheme,
  catppuccin: catppuccinTheme,
  monokai: monokaiTheme,
  solarized: solarizedTheme,
  tokyoNight: tokyoNightTheme,
  oneDark: oneDarkTheme,
  highContrast: highContrastTheme,
};

/** Get a named theme by string key, falling back to defaultDark if not found. */
export function getNamedTheme(name: string): ThemeTokens {
  return NAMED_THEMES[name] ?? defaultDark;
}
