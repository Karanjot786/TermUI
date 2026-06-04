import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { LogView } from './LogView.js';

function screenRow(screen: Screen, row: number): string {
  return screen.back[row].map((cell: { char: string }) => cell.char).join('').trimEnd();
}

describe('LogView', () => {
  it('renders a single appended line', () => {
    const screen = new Screen(20, 3);
    const log = new LogView({ width: 20, height: 3 });
    log.updateRect({ x: 0, y: 0, width: 20, height: 3 });
    log.appendLine('hello world');
    log.render(screen);
    expect(screenRow(screen, 0)).toContain('hello world');
  });

  it('shows the newest line after scroll', () => {
    const screen = new Screen(20, 2);
    const log = new LogView({ width: 20, height: 2 });
    log.updateRect({ x: 0, y: 0, width: 20, height: 2 });
    log.appendLine('line 1');
    log.appendLine('line 2');
    log.appendLine('line 3');
    log.render(screen);
    const rows = [screenRow(screen, 0), screenRow(screen, 1)];
    expect(rows.some(r => r.includes('line 3'))).toBe(true);
  });

  it('scrolls old lines out of view when overflow occurs', () => {
    const screen = new Screen(20, 2);
    const log = new LogView({ width: 20, height: 2 });
    log.updateRect({ x: 0, y: 0, width: 20, height: 2 });
    log.appendLine('line 1');
    log.appendLine('line 2');
    log.appendLine('line 3');
    log.render(screen);
    const rows = [screenRow(screen, 0), screenRow(screen, 1)];
    expect(rows.some(r => r.includes('line 1'))).toBe(false);
  });

  it('renders multiple lines within viewport height', () => {
    const screen = new Screen(20, 3);
    const log = new LogView({ width: 20, height: 3 });
    log.updateRect({ x: 0, y: 0, width: 20, height: 3 });
    log.appendLine('alpha');
    log.appendLine('beta');
    log.appendLine('gamma');
    log.render(screen);
    const rows = [screenRow(screen, 0), screenRow(screen, 1), screenRow(screen, 2)];
    expect(rows.some(r => r.includes('alpha'))).toBe(true);
    expect(rows.some(r => r.includes('beta'))).toBe(true);
    expect(rows.some(r => r.includes('gamma'))).toBe(true);
  });

  it('renders an empty view without throwing', () => {
    const screen = new Screen(20, 3);
    const log = new LogView({ width: 20, height: 3 });
    log.updateRect({ x: 0, y: 0, width: 20, height: 3 });
    expect(() => log.render(screen)).not.toThrow();
  });
});
