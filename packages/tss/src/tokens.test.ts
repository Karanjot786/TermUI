import { describe, it, expect, afterEach, vi } from 'vitest';
import { tokensToTSS, loadThemeFromFile } from './tokens.js';
import { writeFileSync, unlinkSync } from 'node:fs';

describe('ThemeTokens', () => {
  const requiredKeys = [
    'bg',
    'fg',
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'muted',
    'border',
    'highlight',
  ];

  it('defaultDark has all 10 required keys with non-empty string values', async () => {
    const { defaultDark } = await import('./tokens.js');
    for (const key of requiredKeys) {
      expect(defaultDark).toHaveProperty(key);
      // key is a keyof defaultDark because we iterate Object.keys(defaultDark)
      expect(typeof defaultDark[key as keyof typeof defaultDark]).toBe('string');
      // key is a keyof defaultDark because we iterate Object.keys(defaultDark)
      expect(defaultDark[key as keyof typeof defaultDark]).toBeTruthy();
    }
    expect(Object.keys(defaultDark)).toHaveLength(10);
  });

  it('defaultLight has all 10 required keys with non-empty string values', async () => {
    const { defaultLight } = await import('./tokens.js');
    for (const key of requiredKeys) {
      expect(defaultLight).toHaveProperty(key);
      // key is a keyof defaultLight because we iterate Object.keys(defaultLight)
      expect(typeof defaultLight[key as keyof typeof defaultLight]).toBe('string');
      // key is a keyof defaultLight because we iterate Object.keys(defaultLight)
      expect(defaultLight[key as keyof typeof defaultLight]).toBeTruthy();
    }
    expect(Object.keys(defaultLight)).toHaveLength(10);
  });

  it('systemTheme equals defaultDark when COLORFGBG=15;0 (dark terminal)', async () => {
    vi.stubEnv('COLORFGBG', '15;0');
    vi.resetModules();
    const { systemTheme, defaultDark } = await import('./tokens.js');
    expect(systemTheme).toEqual(defaultDark);
  });

  it('systemTheme equals defaultLight when COLORFGBG=0;15 (light terminal)', async () => {
    vi.stubEnv('COLORFGBG', '0;15');
    vi.resetModules();
    const { systemTheme, defaultLight } = await import('./tokens.js');
    expect(systemTheme).toEqual(defaultLight);
  });

  it('systemTheme equals defaultLight when TERM_BACKGROUND=light', async () => {
    vi.stubEnv('COLORFGBG', '');
    vi.stubEnv('TERM_BACKGROUND', 'light');
    vi.resetModules();
    const { systemTheme, defaultLight } = await import('./tokens.js');
    expect(systemTheme).toEqual(defaultLight);
  });

  it('systemTheme equals defaultDark by default (no env vars)', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { systemTheme, defaultDark } = await import('./tokens.js');
    expect(systemTheme).toEqual(defaultDark);
  });
});

describe('tokensToTSS', () => {
  it('produces a valid @theme block', () => {
    const result = tokensToTSS('dracula', {
      primary: '#bd93f9',
      background: '#282a36',
    } as any);
    expect(result).toBe('@theme dracula {\n  --primary: #bd93f9;\n  --background: #282a36;\n}');
  });

  it('handles empty tokens', () => {
    const result = tokensToTSS('empty', {} as any);
    expect(result).toBe('@theme empty {\n\n}');
  });
});

describe('loadThemeFromFile', () => {
  const tempJsonFile = './temp-theme.json';
  const tempYamlFile = './temp-theme.yaml';

  afterEach(() => {
    try {
      unlinkSync(tempJsonFile);
    } catch {}
    try {
      unlinkSync(tempYamlFile);
    } catch {}
  });

  it('correctly loads theme tokens from flat JSON file', () => {
    writeFileSync(tempJsonFile, JSON.stringify({
      bg: '#111111',
      fg: '#222222',
      primary: '#333333',
    }));

    const tokens = loadThemeFromFile(tempJsonFile);
    expect(tokens.bg).toBe('#111111');
    expect(tokens.fg).toBe('#222222');
    expect(tokens.primary).toBe('#333333');
    expect(tokens.secondary).toBe('#6366f1'); // default fallback
  });

  it('correctly loads theme tokens from nested tokens JSON file', () => {
    writeFileSync(tempJsonFile, JSON.stringify({
      name: 'nested-theme',
      tokens: {
        bg: '#aaaaaa',
        fg: '#bbbbbb',
      }
    }));

    const tokens = loadThemeFromFile(tempJsonFile);
    expect(tokens.bg).toBe('#aaaaaa');
    expect(tokens.fg).toBe('#bbbbbb');
    expect(tokens.primary).toBe('#7C3AED'); // default fallback
  });

  it('correctly loads theme tokens from flat YAML file', () => {
    writeFileSync(tempYamlFile, `
bg: '#111111'
fg: '#222222'
primary: '#333333'
`);

    const tokens = loadThemeFromFile(tempYamlFile);
    expect(tokens.bg).toBe('#111111');
    expect(tokens.fg).toBe('#222222');
    expect(tokens.primary).toBe('#333333');
    expect(tokens.secondary).toBe('#6366f1'); // default fallback
  });

  it('correctly loads theme tokens from nested tokens YAML file', () => {
    writeFileSync(tempYamlFile, `
name: 'nested-theme'
tokens:
  bg: '#aaaaaa'
  fg: '#bbbbbb'
`);

    const tokens = loadThemeFromFile(tempYamlFile);
    expect(tokens.bg).toBe('#aaaaaa');
    expect(tokens.fg).toBe('#bbbbbb');
    expect(tokens.primary).toBe('#7C3AED'); // default fallback
  });
});
