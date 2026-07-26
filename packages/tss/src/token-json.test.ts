import { describe, expect, it } from 'vitest';
import { compileTokensToJSON } from './tokens.js';

const SOURCE = `
@theme default {
  --bg: #000000;
  --fg: #ffffff;
  --accent: var(--fg);
}

@theme light {
  --bg: #ffffff;
  --fg: #111111;
}
`;

describe('compiled token JSON export', () => {
  it('exports the active default theme tokens with resolved aliases', () => {
    expect(compileTokensToJSON(SOURCE)).toEqual({
      theme: 'default',
      tokens: {
        accent: '#ffffff',
        bg: '#000000',
        fg: '#ffffff',
      },
    });
  });

  it('exports selected theme tokens merged over default tokens', () => {
    expect(compileTokensToJSON(SOURCE, 'light')).toEqual({
      theme: 'light',
      tokens: {
        accent: '#111111',
        bg: '#ffffff',
        fg: '#111111',
      },
    });
  });

  it('falls back to the first theme when no default theme exists', () => {
    expect(compileTokensToJSON('@theme custom { --fg: #f0f0f0; }', 'missing')).toEqual({
      theme: 'missing',
      tokens: {
        fg: '#f0f0f0',
      },
    });
  });
});
