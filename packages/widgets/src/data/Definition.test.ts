import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { Definition } from './Definition.js';

/** Read a full row of characters from the screen as a trimmed string */
function screenRow(screen: Screen, row: number): string {
  return screen.back[row].map((cell: { char: string }) => cell.char).join('').trimEnd();
}

describe('Definition', () => {
  it('renders the term on its own row', () => {
    // term on row 0, definition indented on row 1
    const screen = new Screen(30, 4);
    const def = new Definition([{ term: 'Name', definition: 'Alice' }], { width: 30, height: 4 });
    def.updateRect({ x: 0, y: 0, width: 30, height: 4 });
    def.render(screen);
    expect(screenRow(screen, 0)).toContain('Name');
  });

  it('renders the definition indented below the term', () => {
    const screen = new Screen(30, 4);
    const def = new Definition([{ term: 'Name', definition: 'Alice' }], { width: 30, height: 4 });
    def.updateRect({ x: 0, y: 0, width: 30, height: 4 });
    def.render(screen);
    expect(screenRow(screen, 1)).toContain('Alice');
  });

  it('renders multiple pairs', () => {
    // each pair needs 3 rows (term + def + blank), so 3 pairs = 9 rows
    const screen = new Screen(30, 9);
    const def = new Definition(
      [
        { term: 'Host', definition: 'localhost' },
        { term: 'Port', definition: '3000' },
        { term: 'Env',  definition: 'production' },
      ],
      { width: 30, height: 9 },
    );
    def.updateRect({ x: 0, y: 0, width: 30, height: 9 });
    def.render(screen);
    const allRows = Array.from({ length: 9 }, (_, i) => screenRow(screen, i)).join('\n');
    expect(allRows).toContain('Host');
    expect(allRows).toContain('localhost');
    expect(allRows).toContain('Port');
    expect(allRows).toContain('3000');
    expect(allRows).toContain('Env');
    expect(allRows).toContain('production');
  });

  it('renders each term on a distinct row', () => {
    const screen = new Screen(30, 8);
    const def = new Definition(
      [
        { term: 'Alpha', definition: 'first' },
        { term: 'Beta',  definition: 'second' },
      ],
      { width: 30, height: 8 },
    );
    def.updateRect({ x: 0, y: 0, width: 30, height: 8 });
    def.render(screen);
    const rows = Array.from({ length: 8 }, (_, i) => screenRow(screen, i));
    const alphaRow = rows.findIndex(r => r.includes('Alpha'));
    const betaRow  = rows.findIndex(r => r.includes('Beta'));
    expect(alphaRow).toBeGreaterThanOrEqual(0);
    expect(betaRow).toBeGreaterThanOrEqual(0);
    expect(alphaRow).not.toBe(betaRow);
  });

  it('accepts a Record<string,string> and renders without throwing', () => {
    const screen = new Screen(30, 4);
    const def = new Definition({ Version: '1.0.0', Author: 'Dev' }, { width: 30, height: 4 });
    def.updateRect({ x: 0, y: 0, width: 30, height: 4 });
    expect(() => def.render(screen)).not.toThrow();
  });

  it('renders an empty list without throwing', () => {
    const screen = new Screen(30, 3);
    const def = new Definition([], {}, {});
    def.updateRect({ x: 0, y: 0, width: 30, height: 3 });
    expect(() => def.render(screen)).not.toThrow();
  });
});