import { describe, it, expect, vi } from 'vitest';
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

  it('renders lines and highlights ERROR, WARN, INFO keywords', () => {
    const logView = new LogView({ width: 20, height: 4 });
    logView.updateRect({ x: 0, y: 0, width: 20, height: 4 });
    logView.setLines([
      'INFO: Starting',
      'WARN: Warning text',
      'ERROR: Fatal failure',
      'Just normal text',
    ]);
    const screen = new Screen(20, 4);
    logView.render(screen);

    const rows = screen.back.map(row => row.map(cell => cell.char).join(''));
    expect(rows[0]).toContain('INFO: Starting');
    expect(rows[1]).toContain('WARN: Warning text');
    expect(rows[2]).toContain('ERROR: Fatal failure');
    expect(rows[3]).toContain('Just normal text');

    // Verify colors are applied based on keywords
    expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'green' });
    expect(screen.back[1][0].fg).toEqual({ type: 'named', name: 'yellow' });
    expect(screen.back[2][0].fg).toEqual({ type: 'named', name: 'red' });
    expect(screen.back[3][0].fg.type).toBe('none');
  });

  it('respects autoScroll: false', () => {
    const logView = new LogView({ width: 20, height: 2 }, { autoScroll: false });
    logView.updateRect({ x: 0, y: 0, width: 20, height: 2 });
    logView.setLines(['Line 1', 'Line 2']);

    const screen = new Screen(20, 2);
    logView.render(screen);
    let rows = screen.back.map(row => row.map(cell => cell.char).join(''));
    expect(rows[0]).toContain('Line 1');
    expect(rows[1]).toContain('Line 2');

    // Append line 3, with autoScroll: false it should still show Line 1 and Line 2
    logView.appendLine('Line 3');
    const screen2 = new Screen(20, 2);
    logView.render(screen2);
    rows = screen2.back.map(row => row.map(cell => cell.char).join(''));
    expect(rows[0]).toContain('Line 1');
    expect(rows[1]).toContain('Line 2');
  });

  it('scrolls manually and triggers markDirty()', () => {
    const logView = new LogView({ width: 20, height: 2 }, { autoScroll: false });
    logView.updateRect({ x: 0, y: 0, width: 20, height: 2 });
    logView.setLines(['Line 1', 'Line 2', 'Line 3', 'Line 4']);

    const spy = vi.spyOn(logView, 'markDirty');

    // Scroll down
    logView.scrollDown(2);
    expect(spy).toHaveBeenCalled();
    spy.mockClear();

    const screen = new Screen(20, 2);
    logView.render(screen);
    let rows = screen.back.map(row => row.map(cell => cell.char).join(''));
    // With offset = 2, we expect Line 3 and Line 4 to render
    expect(rows[0]).toContain('Line 3');
    expect(rows[1]).toContain('Line 4');

    // Scroll up
    logView.scrollUp(1);
    expect(spy).toHaveBeenCalled();

    const screen2 = new Screen(20, 2);
    logView.render(screen2);
    rows = screen2.back.map(row => row.map(cell => cell.char).join(''));
    // With offset = 1, we expect Line 2 and Line 3 to render
    expect(rows[0]).toContain('Line 2');
    expect(rows[1]).toContain('Line 3');
  });

  it('scrollDown clamps to the last full page to prevent blank lines', () => {
    const logView = new LogView({ width: 20, height: 2 }, { autoScroll: false });
    logView.updateRect({ x: 0, y: 0, width: 20, height: 2 });
    logView.setLines(['Line 1', 'Line 2', 'Line 3', 'Line 4']);

    // Scroll down past maximum possible offset (4 lines, height 2 -> max offset is 2)
    logView.scrollDown(10);

    const screen = new Screen(20, 2);
    logView.render(screen);
    const rows = screen.back.map(row => row.map(cell => cell.char).join(''));
    // With offset clamped to 2, it must still render Line 3 and Line 4 (not trailing blank lines)
    expect(rows[0]).toContain('Line 3');
    expect(rows[1]).toContain('Line 4');
  });

  it('appendLine() beyond maxLines trims oldest entries from rendered output', () => {
    const screen = new Screen(20, 3);
    const log = new LogView({ width: 20, height: 3 }, { maxLines: 3, autoScroll: false });
    log.updateRect({ x: 0, y: 0, width: 20, height: 3 });
    log.appendLine('line 1');
    log.appendLine('line 2');
    log.appendLine('line 3');
    log.appendLine('line 4');
    log.render(screen);

    const rows = [screenRow(screen, 0), screenRow(screen, 1), screenRow(screen, 2)];
    expect(rows.some(r => r.includes('line 1'))).toBe(false);
    expect(rows.some(r => r.includes('line 2'))).toBe(true);
    expect(rows.some(r => r.includes('line 3'))).toBe(true);
    expect(rows.some(r => r.includes('line 4'))).toBe(true);
  });

  it('renders only the most recent maxLines lines after many appends', () => {
    const screen = new Screen(20, 5);
    const log = new LogView({ width: 20, height: 5 }, { maxLines: 5 });
    log.updateRect({ x: 0, y: 0, width: 20, height: 5 });
    for (let i = 0; i < 20; i++) {
      log.appendLine(`line ${i}`);
    }
    log.render(screen);

    const rows = [0, 1, 2, 3, 4].map(i => screenRow(screen, i));
    expect(rows.some(r => r.includes('line 0'))).toBe(false);
    expect(rows.some(r => r.includes('line 14'))).toBe(false);
    expect(rows.some(r => r.includes('line 15'))).toBe(true);
    expect(rows.some(r => r.includes('line 19'))).toBe(true);
  });

  it('allows all lines to render when maxLines is 0 or not set', () => {
    const defaultLog = new LogView({ width: 20, height: 10 });
    const explicitLog = new LogView({ width: 20, height: 10 }, { maxLines: 0 });
    defaultLog.updateRect({ x: 0, y: 0, width: 20, height: 10 });
    explicitLog.updateRect({ x: 0, y: 0, width: 20, height: 10 });

    for (let i = 0; i < 10; i++) {
      defaultLog.appendLine(`default ${i}`);
      explicitLog.appendLine(`explicit ${i}`);
    }

    const defaultScreen = new Screen(20, 10);
    defaultLog.render(defaultScreen);
    const defaultRows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => screenRow(defaultScreen, i));
    for (let i = 0; i < 10; i++) {
      expect(defaultRows.some(r => r.includes(`default ${i}`))).toBe(true);
    }

    const explicitScreen = new Screen(20, 10);
    explicitLog.render(explicitScreen);
    const explicitRows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => screenRow(explicitScreen, i));
    for (let i = 0; i < 10; i++) {
      expect(explicitRows.some(r => r.includes(`explicit ${i}`))).toBe(true);
    }
  });
});
