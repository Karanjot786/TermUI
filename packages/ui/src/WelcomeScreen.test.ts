import { describe, it, expect, vi } from 'vitest';
import { Screen, stringWidth } from '@termuijs/core';
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

  it('clips long keymap hints to the screen width', () => {
    const ws = new WelcomeScreen({
      title: 'HI',
      keymap: [
        { key: 'Enter', action: 'Start the very long onboarding workflow' },
        { key: 'Escape', action: 'Cancel everything' },
      ],
    });
    const screen = new Screen(12, 8);
    const writeSpy = vi.spyOn(screen, 'writeString');

    ws.updateRect({ x: 0, y: 0, width: 12, height: 8 });
    ws.render(screen);

    for (const call of writeSpy.mock.calls) {
      if (call[1] === 7) {
        expect(call[0] + stringWidth(String(call[2]))).toBeLessThanOrEqual(12);
      }
    }
  });
});
