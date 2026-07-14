import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { WelcomeScreen } from './WelcomeScreen.js';

function render(widget: WelcomeScreen, w = 40, h = 15): string {
  const screen = new Screen(w, h);
  widget.updateRect({ x: 0, y: 0, width: w, height: h });
  widget.render(screen);
  return screen.back.map(row => row.map(cell => cell.char).join('')).join('\n');
}

describe('WelcomeScreen', () => {
  it('renders without throwing', () => {
    const ws = new WelcomeScreen({ title: 'HELLO' });
    expect(() => render(ws)).not.toThrow();
  });

  it('renders subtitle when provided', () => {
    const ws = new WelcomeScreen({ title: 'HI', subtitle: 'Welcome to the app' });
    const out = render(ws);
    expect(out).toContain('Welcome to the app');
  });

  it('renders tagline when provided', () => {
    const ws = new WelcomeScreen({ title: 'HI', tagline: 'v1.0.0' });
    const out = render(ws);
    expect(out).toContain('v1.0.0');
  });

  it('renders keymap hints', () => {
    const ws = new WelcomeScreen({
      title: 'HI',
      keymap: [{ key: 'Enter', action: 'Start' }, { key: 'q', action: 'Quit' }],
    });
    const out = render(ws);
    expect(out).toContain('Enter');
    expect(out).toContain('Start');
  });

  it('renders with no subtitle/tagline/keymap', () => {
    const ws = new WelcomeScreen({ title: 'X' });
    expect(() => render(ws)).not.toThrow();
  });
});
