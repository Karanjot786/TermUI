import { describe, it, expect } from 'vitest';
import {
  cobalt2Theme, nightOwlTheme, ayuTheme, materialTheme, synthwaveTheme,
  kanagawaTheme, catppuccinLatteTheme, catppuccinFrappeTheme, catppuccinMacchiatoTheme,
  horizonTheme, snazzyTheme, vesperTheme, gruvboxLightTheme,
  NAMED_THEMES, getNamedTheme,
} from './named-themes.js';

describe('named themes', () => {
  const NEW_THEMES = [
    'cobalt2', 'nightOwl', 'ayu', 'material', 'synthwave', 'kanagawa',
    'catppuccinLatte', 'catppuccinFrappe', 'catppuccinMacchiato',
    'horizon', 'snazzy', 'vesper', 'gruvboxLight',
  ];

  it('registers all new themes in NAMED_THEMES', () => {
    for (const name of NEW_THEMES) {
      expect(NAMED_THEMES[name], `NAMED_THEMES["${name}"] missing`).toBeDefined();
    }
  });

  it('each new theme has all 10 ThemeTokens fields', () => {
    const fields = ['bg','fg','primary','secondary','success','warning','error','muted','border','highlight'];
    for (const name of NEW_THEMES) {
      const theme = NAMED_THEMES[name]!;
      for (const field of fields) {
        expect((theme as any)[field], `${name}.${field} missing`).toBeDefined();
      }
    }
  });

  it('getNamedTheme resolves new themes by key', () => {
    expect(getNamedTheme('cobalt2').bg).toBe('#193549');
    expect(getNamedTheme('nightOwl').bg).toBe('#011627');
    expect(getNamedTheme('catppuccinLatte').bg).toBe('#eff1f5');
  });

  it('catppuccin light variant has light background', () => {
    expect(catppuccinLatteTheme.bg).toBe('#eff1f5');
    // latte is the light catppuccin — bg should be near-white
    expect(catppuccinLatteTheme.bg.toLowerCase()).not.toBe('#1e1e2e');
  });
});
