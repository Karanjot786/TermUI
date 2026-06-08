import { readFileSync } from 'node:fs';

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

/**
 * Simple stack-based YAML parser for flat/nested config files.
 * Avoids heavy external dependency footprints.
 */
function parseYaml(content: string): any {
  const result: any = {};
  const lines = content.split(/\r?\n/);
  const stack: { indent: number; obj: any }[] = [{ indent: -1, obj: result }];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (!match) continue;

    const indent = match[1].length;
    const key = match[2].trim().replace(/^['"]|['"]$/g, '');
    let val = match[3].trim();

    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const currentContext = stack[stack.length - 1].obj;

    if (val === '') {
      const newObj = {};
      currentContext[key] = newObj;
      stack.push({ indent, obj: newObj });
    } else {
      currentContext[key] = val;
    }
  }

  return result;
}

/**
 * Load theme tokens from a JSON or YAML file.
 * Reads the file, parses it, and extracts the theme tokens.
 */
export function loadThemeFromFile(filePath: string): ThemeTokens {
    const content = readFileSync(filePath, 'utf-8');
    const isYaml = filePath.endsWith('.yaml') || filePath.endsWith('.yml');
    const parsed = isYaml ? parseYaml(content) : JSON.parse(content);
    
    // Support nested "tokens" property or flat root level
    const tokens = parsed.tokens ?? parsed;
    
    return {
        bg: tokens.bg ?? '#000000',
        fg: tokens.fg ?? '#ffffff',
        primary: tokens.primary ?? '#7C3AED',
        secondary: tokens.secondary ?? '#6366f1',
        success: tokens.success ?? '#22c55e',
        warning: tokens.warning ?? '#f59e0b',
        error: tokens.error ?? '#ef4444',
        muted: tokens.muted ?? '#6b7280',
        border: tokens.border ?? '#374151',
        highlight: tokens.highlight ?? '#1e1b4b',
    };
}
