// ─────────────────────────────────────────────────────
// @termuijs/tss — Terminal Style Sheets
// ─────────────────────────────────────────────────────

// Tokenizer
export { tokenize, TokenType } from './tokenizer.js';
export type { Token } from './tokenizer.js';

// Parser
export { parse } from './parser.js';
export type { TSSStylesheet, TSSTheme, TSSSelector, TSSProperty, TSSValue, TSSRule } from './parser.js';

// Theme Engine
export { ThemeEngine, compile } from './engine.js';
export type { ThemeVariables, ResolvedRule } from './engine.js';

// Built-in Themes
export { BUILTIN_THEMES, getBuiltinThemeNames, getBuiltinTheme, getAllBuiltinThemes } from './themes.js';

// Design Tokens
export { systemTheme, defaultDark, defaultLight, detectDark, tokensToTSS } from './tokens.js';
export type { ThemeTokens } from './tokens.js';

// Named ThemeTokens
export {
  draculaTheme, nordTheme, catppuccinTheme, monokaiTheme,
  solarizedTheme, tokyoNightTheme, oneDarkTheme,
  NAMED_THEMES, getNamedTheme,
} from './named-themes.js';

// Hot-Reload Watcher
export { TSSWatcher } from './watcher.js';
export type { WatcherOptions } from './watcher.js';

// AutoThemeProvider
export { AutoThemeProvider, ThemeContext, useTheme } from './AutoThemeProvider.js';
export type { AutoThemeProviderProps } from './AutoThemeProvider.js';
