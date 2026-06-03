import { describe, it, expect, vi } from 'vitest';
import { Screen } from '../terminal/Screen.js';
import { mergeBorders, ASCII_JUNCTIONS, } from './border-merge.js';

describe('border merge', () => {
        

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
  }  );
   
  
 it('provides ASCII fallback junction mappings', () => {
    expect(ASCII_JUNCTIONS.LRTB).toBe('+');
    expect(ASCII_JUNCTIONS.TB).toBe('|');
    expect(ASCII_JUNCTIONS.LR).toBe('-');
  });
    

  

});