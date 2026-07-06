import { describe, it, expect, vi } from 'vitest';
import { Screen } from '../terminal/Screen.js';
import { mergeBorders, ASCII_JUNCTIONS, SINGLE_JUNCTIONS, DOUBLE_JUNCTIONS, HEAVY_JUNCTIONS } from './border-merge.js';
import { caps } from '../terminal/env-caps.js';

describe('border merge', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('merges a cross intersection into ┼', () => {
        const screen = new Screen(7, 7);

        screen.setCell(3, 2, { char: '│' });
        screen.setCell(3, 4, { char: '│' });

        screen.setCell(2, 3, { char: '─' });
        screen.setCell(4, 3, { char: '─' });

        mergeBorders(screen);

        expect(screen.back[3][3].char).toBe('┼');
    });

    it('merges a left tee into ├', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '│' });
    screen.setCell(3, 4, { char: '│' });

    screen.setCell(4, 3, { char: '─' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('├');
  });

   it('merges a right tee into ┤', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '│' });
    screen.setCell(3, 4, { char: '│' });

    screen.setCell(2, 3, { char: '─' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┤');
  });

  it('merges a top tee into ┬', () => {
    const screen = new Screen(7, 7);

    screen.setCell(2, 3, { char: '─' });
    screen.setCell(4, 3, { char: '─' });

    screen.setCell(3, 4, { char: '│' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┬');
  });

  it('merges a bottom tee into ┴', () => {
    const screen = new Screen(7, 7);

    screen.setCell(2, 3, { char: '─' });
    screen.setCell(4, 3, { char: '─' });

    screen.setCell(3, 2, { char: '│' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┴');
  });

  it('leaves border characters unchanged when merge is not applied', () => {
    const screen = new Screen(5, 5);

    screen.setCell(2, 2, { char: '│' });
    mergeBorders(screen);
    expect(screen.back[2][2].char).toBe('│');
  });
 
  it('merges a top-left corner into ┌', () => {
    const screen = new Screen(7, 7);

    screen.setCell(4, 3, { char: '─' });
    screen.setCell(3, 4, { char: '│' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┌');
});

it('merges a top-right corner into ┐', () => {
    const screen = new Screen(7, 7);

    screen.setCell(2, 3, { char: '─' });
    screen.setCell(3, 4, { char: '│' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┐');
});

it('merges a bottom-left corner into └', () => {
    const screen = new Screen(7, 7);

    screen.setCell(4, 3, { char: '─' });
    screen.setCell(3, 2, { char: '│' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('└');
});

it('merges a bottom-right corner into ┘', () => {
    const screen = new Screen(7, 7);

    screen.setCell(2, 3, { char: '─' });
    screen.setCell(3, 2, { char: '│' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┘');
  });
 
 it('preserves a right horizontal segment', () => {
    const screen = new Screen(5, 5);

    screen.setCell(3, 2, { char: '─' });

    mergeBorders(screen);

    expect(screen.back[2][3].char).toBe('─');
  });

 it('preserves a left horizontal segment', () => {
    const screen = new Screen(5, 5);

    screen.setCell(1, 2, { char: '─' });

    mergeBorders(screen);

    expect(screen.back[2][1].char).toBe('─');
  });

  it('preserves a top vertical segment', () => {
    const screen = new Screen(5, 5);

    screen.setCell(2, 1, { char: '│' });

    mergeBorders(screen);

    expect(screen.back[1][2].char).toBe('│'); 
   });

  it('preserves a bottom vertical segment', () => {
    const screen = new Screen(5, 5);

    screen.setCell(2, 3, { char: '│' });

    mergeBorders(screen);

    expect(screen.back[3][2].char).toBe('│');
  });
    
   
 it('provides ASCII fallback junction mappings', () => {
    expect(ASCII_JUNCTIONS.LRTB).toBe('+');
    expect(ASCII_JUNCTIONS.TB).toBe('|');
    expect(ASCII_JUNCTIONS.LR).toBe('-');
  });

  // ── Double border style tests ──────────────────────

  it('merges double border cross into ╬', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '║' });
    screen.setCell(3, 4, { char: '║' });
    screen.setCell(2, 3, { char: '═' });
    screen.setCell(4, 3, { char: '═' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('╬');
  });

  it('merges double border tees correctly', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '║' });
    screen.setCell(3, 4, { char: '║' });
    screen.setCell(4, 3, { char: '═' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('╟');
  });

  // ── Heavy border style tests ───────────────────────

  it('merges heavy border cross into ┿', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '┃' });
    screen.setCell(3, 4, { char: '┃' });
    screen.setCell(2, 3, { char: '━' });
    screen.setCell(4, 3, { char: '━' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┿');
  });

  it('merges heavy border tees correctly', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '┃' });
    screen.setCell(3, 4, { char: '┃' });
    screen.setCell(4, 3, { char: '━' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┠');
  });

  // ── Mixed border style tests ───────────────────────

  it('merges mixed single-vertical double-horizontal cross using heavier double junctions', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '│' });
    screen.setCell(3, 4, { char: '│' });
    screen.setCell(2, 3, { char: '═' });
    screen.setCell(4, 3, { char: '═' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('╬');
  });

  it('merges mixed double-vertical single-horizontal cross using heavier double junctions', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '║' });
    screen.setCell(3, 4, { char: '║' });
    screen.setCell(2, 3, { char: '─' });
    screen.setCell(4, 3, { char: '─' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('╬');
  });

  it('merges mixed light-heavy cross using heavier heavy junctions', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '┃' });
    screen.setCell(3, 4, { char: '┃' });
    screen.setCell(2, 3, { char: '─' });
    screen.setCell(4, 3, { char: '─' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┿');
  });

  // ── Dashed border recognition ──────────────────────

  it('recognizes dashed border characters', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '┆' });
    screen.setCell(3, 4, { char: '┆' });
    screen.setCell(2, 3, { char: '┄' });
    screen.setCell(4, 3, { char: '┄' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┼');
  });

  // ── Round corner recognition ───────────────────────

  it('recognizes round corner characters as borders', () => {
    const screen = new Screen(7, 7);

    screen.setCell(4, 3, { char: '─' });
    screen.setCell(3, 4, { char: '╭' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┌');
  });

  // ── Content preservation ───────────────────────────

  it('does not overwrite non-border character at intersection', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '│' });
    screen.setCell(3, 4, { char: '│' });
    screen.setCell(2, 3, { char: '─' });
    screen.setCell(4, 3, { char: '─' });
    // Intersection contains a text character, not a border char
    screen.setCell(3, 3, { char: 'X' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('X');
  });

  it('overwrites empty space at intersection', () => {
    const screen = new Screen(7, 7);

    screen.setCell(3, 2, { char: '│' });
    screen.setCell(3, 4, { char: '│' });
    screen.setCell(2, 3, { char: '─' });
    screen.setCell(4, 3, { char: '─' });
    // Intersection is a space (default)

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┼');
  });

  it('does not overwrite text content adjacent to borders', () => {
    const screen = new Screen(10, 5);

    screen.setCell(3, 2, { char: '│' });
    screen.setCell(3, 4, { char: '│' });
    screen.setCell(2, 3, { char: '─' });
    screen.setCell(4, 3, { char: '─' });
    // Intersection has a letter — should not be replaced
    screen.setCell(3, 3, { char: 'A' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('A');
  });

  // ── Junction map completeness ──────────────────────

  it('SINGLE_JUNCTIONS has all expected keys', () => {
    expect(SINGLE_JUNCTIONS.LRTB).toBe('┼');
    expect(SINGLE_JUNCTIONS.RTB).toBe('├');
    expect(SINGLE_JUNCTIONS.LTB).toBe('┤');
    expect(SINGLE_JUNCTIONS.LRB).toBe('┬');
    expect(SINGLE_JUNCTIONS.LRT).toBe('┴');
    expect(SINGLE_JUNCTIONS.RB).toBe('┌');
    expect(SINGLE_JUNCTIONS.LB).toBe('┐');
    expect(SINGLE_JUNCTIONS.RT).toBe('└');
    expect(SINGLE_JUNCTIONS.LT).toBe('┘');
    expect(SINGLE_JUNCTIONS.TB).toBe('│');
    expect(SINGLE_JUNCTIONS.LR).toBe('─');
  });

  it('DOUBLE_JUNCTIONS has all expected keys', () => {
    expect(DOUBLE_JUNCTIONS.LRTB).toBe('╬');
    expect(DOUBLE_JUNCTIONS.RTB).toBe('╟');
    expect(DOUBLE_JUNCTIONS.LTB).toBe('╢');
    expect(DOUBLE_JUNCTIONS.LRB).toBe('╦');
    expect(DOUBLE_JUNCTIONS.LRT).toBe('╩');
    expect(DOUBLE_JUNCTIONS.RB).toBe('╔');
    expect(DOUBLE_JUNCTIONS.LB).toBe('╗');
    expect(DOUBLE_JUNCTIONS.RT).toBe('╚');
    expect(DOUBLE_JUNCTIONS.LT).toBe('╝');
    expect(DOUBLE_JUNCTIONS.TB).toBe('║');
    expect(DOUBLE_JUNCTIONS.LR).toBe('═');
  });

  it('HEAVY_JUNCTIONS has all expected keys', () => {
    expect(HEAVY_JUNCTIONS.LRTB).toBe('┿');
    expect(HEAVY_JUNCTIONS.RTB).toBe('┠');
    expect(HEAVY_JUNCTIONS.LTB).toBe('┨');
    expect(HEAVY_JUNCTIONS.LRB).toBe('┰');
    expect(HEAVY_JUNCTIONS.LRT).toBe('┸');
    expect(HEAVY_JUNCTIONS.RB).toBe('┏');
    expect(HEAVY_JUNCTIONS.LB).toBe('┓');
    expect(HEAVY_JUNCTIONS.RT).toBe('┗');
    expect(HEAVY_JUNCTIONS.LT).toBe('┛');
    expect(HEAVY_JUNCTIONS.TB).toBe('┃');
    expect(HEAVY_JUNCTIONS.LR).toBe('━');
  });

  // ── Re-merging already-merged junctions ────────────

  it('re-merges existing single junctions correctly', () => {
    const screen = new Screen(7, 7);

    // Set up already-merged junctions
    screen.setCell(3, 2, { char: '│' });
    screen.setCell(3, 4, { char: '│' });
    screen.setCell(2, 3, { char: '─' });
    screen.setCell(4, 3, { char: '─' });
    screen.setCell(3, 3, { char: '┼' });

    mergeBorders(screen);

    expect(screen.back[3][3].char).toBe('┼');
  });
});
