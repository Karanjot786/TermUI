// ─────────────────────────────────────────────────────
// Design Tokens — TypeScript-first color system
// with auto dark/light detection
// ─────────────────────────────────────────────────────

export interface ThemeTokens {
  bg: string;
  fg: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  muted: string;
  border: string;
  highlight: string;
}

/**
 * Detect dark/light terminal based on environment variables.
 * - COLORFGBG: "foreground;background" (e.g. "15;0" = white on black = dark)
 *   Background value: 0-7 = dark, 8-15 = light
 * - TERM_BACKGROUND: "light" or "dark" (set by some terminals like iTerm2)
 * Defaults to dark if no detection available.
 */
export function detectDark(): boolean {
  const colorfgbg = process.env.COLORFGBG;
  if (colorfgbg) {
    const parts = colorfgbg.split(';');
    const bg = parseInt(parts[parts.length - 1], 10);
    return isNaN(bg) || bg < 8; // 0-7 = dark, 8-15 = light
  }

  if (process.env.TERM_BACKGROUND === 'light') return false;

  return true; // default: assume dark terminal
}

export const defaultDark: ThemeTokens = {
  bg: '#000000',
  fg: '#ffffff',
  primary: '#7C3AED',
  secondary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  muted: '#6b7280',
  border: '#374151',
  highlight: '#1e1b4b',
};

export const defaultLight: ThemeTokens = {
  bg: '#ffffff',
  fg: '#000000',
  primary: '#6D28D9',
  secondary: '#4f46e5',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  muted: '#9ca3af',
  border: '#d1d5db',
  highlight: '#ede9fe',
};

/**
 * System theme selected at module load based on terminal detection.
 * Evaluated once; if you need runtime detection, manually call detectDark()
 * and select the appropriate theme.
 */
export const systemTheme: ThemeTokens = detectDark() ? defaultDark : defaultLight;

/**
 * Bridge function: Convert ThemeTokens to TSS string format.
 * Generates a @theme block that can be parsed by ThemeEngine.
 *
 * @example
 * const tssString = tokensToTSS('custom', draculaTheme);
 * // "@theme custom {\n  --bg: #282a36;\n  --fg: #f8f8f2;\n  ...\n}"
 */
export function tokensToTSS(name: string, tokens: ThemeTokens): string {
    return `@theme ${name} {\n` +
        Object.entries(tokens).map(([k, v]) => `  --${k}: ${v};`).join('\n') +
        '\n}';
}
