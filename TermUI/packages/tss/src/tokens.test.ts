import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tokensToTSS } from './tokens.js';

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
  const { defaultDark } = await import('./tokens.ts');    for (const key of requiredKeys) {
      expect(defaultDark).toHaveProperty(key);
      expect(typeof defaultDark[key]).toBe('string');
      expect(defaultDark[key]).toBeTruthy();
    }
    expect(Object.keys(defaultDark)).toHaveLength(10);
  });

  it('defaultLight has all 10 required keys with non-empty string values', async () => {
  const { defaultLight } = await import('./tokens.ts');    for (const key of requiredKeys) {
      expect(defaultLight).toHaveProperty(key);
      expect(typeof defaultLight[key]).toBe('string');
      expect(defaultLight[key]).toBeTruthy();
    }
    expect(Object.keys(defaultLight)).toHaveLength(10);
  });

  it('systemTheme equals defaultDark when COLORFGBG=15;0 (dark terminal)', async () => {
    vi.stubEnv('COLORFGBG', '15;0');
    vi.resetModules();
    const { systemTheme, defaultDark } = await import('./tokens.ts');
    expect(systemTheme).toEqual(defaultDark);
  });

  it('systemTheme equals defaultLight when COLORFGBG=0;15 (light terminal)', async () => {
    vi.stubEnv('COLORFGBG', '0;15');
    vi.resetModules();
    const { systemTheme, defaultLight } = await import('./tokens.ts');
    expect(systemTheme).toEqual(defaultLight);
  });

  it('systemTheme equals defaultLight when TERM_BACKGROUND=light', async () => {
    vi.stubEnv('COLORFGBG', '');
    vi.stubEnv('TERM_BACKGROUND', 'light');
    vi.resetModules();
    const { systemTheme, defaultLight } = await import('./tokens.ts');
    expect(systemTheme).toEqual(defaultLight);
  });

  it('systemTheme equals defaultDark by default (no env vars)', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { systemTheme, defaultDark } = await import('./tokens.ts');
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
