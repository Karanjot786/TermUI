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
export { ThemeEngine, compile, compileRules } from './engine.js';
export type { ThemeVariables, ResolvedRule } from './engine.js';
export { evalCalc } from './calc.js';

// Pseudo-class state matching
export { isSupportedPseudo, matchesPseudo, SUPPORTED_PSEUDO_CLASSES } from './pseudo.js';
export type { PseudoClass } from './pseudo.js';

// Built-in Themes
export { BUILTIN_THEMES, getBuiltinThemeNames, getBuiltinTheme, getAllBuiltinThemes } from './themes.js';

// Design Tokens
export { systemTheme, defaultDark, defaultLight, detectDark, tokensToTSS, loadThemeFromFile } from './tokens.js';
export type { ThemeTokens } from './tokens.js';
export { adaptive, type AdaptiveColor } from './adaptive.js';

// Named ThemeTokens
export {
  draculaTheme, nordTheme, catppuccinTheme, monokaiTheme,
  solarizedTheme, solarizedLightTheme, tokyoNightTheme, oneDarkTheme, highContrastTheme,
  rosePineTheme,
  NAMED_THEMES, getNamedTheme,
} from './named-themes.js';

// Theme utilities
export { deriveTheme } from './theme/derive.js';
export type { DerivedTheme, NormalColorPair } from './theme/derive.js';

// Hot-Reload Watcher
export { TSSWatcher } from './watcher.js';
export type { WatcherOptions } from './watcher.js';

// AutoThemeProvider
export { AutoThemeProvider, ThemeContext, useTheme } from './AutoThemeProvider.js';
export type { AutoThemeProviderProps } from './AutoThemeProvider.js';

// Imperative ThemeProvider singleton
export { ThemeProvider } from './themeProvider.js';
export type { ThemeChangeListener } from './themeProvider.js';
export * from './media.js';
export * from './importer.js';
export { lighten, darken, alpha, evalColorFunction } from './color-functions.js';

// @keyframes support
export { extractKeyframes } from './animations.js';
export type { KeyframesDeclaration } from './animations.js';
