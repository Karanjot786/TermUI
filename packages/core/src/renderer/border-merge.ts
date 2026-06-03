import type { Screen } from '../terminal/Screen.js';
import { caps } from '../terminal/env-caps.js';

const VERTICAL = new Set(['│', '|']);
const HORIZONTAL = new Set(['─', '-']);

function isVertical(char: string): boolean {
    return VERTICAL.has(char);
}

function isHorizontal(char: string): boolean {
    return HORIZONTAL.has(char);
}

 export const  UNICODE_JUNCTIONS =
     {
        LRTB: '┼',
        RTB: '├',
        LTB: '┤',
        LRB: '┬',
        LRT: '┴',

        RB: '┌',
        LB: '┐',
        RT: '└',
        LT: '┘',

        TB: '│',
        LR: '─',

        R: '─',
        L: '─',
        T: '│',
        B: '│',
    };
    export const ASCII_JUNCTIONS = {
        LRTB: '+',
        RTB: '+',
        LTB: '+',
        LRB: '+',
        LRT: '+',

        RB: '+',
        LB: '+',
        RT: '+',
        LT: '+',

        TB: '|',
        LR: '-',

        R: '-',
        L: '-',
        T: '|',
        B: '|',
    };

    // Choose junction set based on terminal capabilities
    const JUNCTIONS = caps.unicode ? UNICODE_JUNCTIONS : ASCII_JUNCTIONS;

export function mergeBorders(screen: Screen): void {
    const grid = screen.back;

    for (let row = 0; row < screen.rows; row++) {
        for (let col = 0; col < screen.cols; col++) {
            const cell = grid[row][col];

            const top = row > 0 ? grid[row - 1][col].char : '';
            const bottom = row < screen.rows - 1 ? grid[row + 1][col].char : '';
            const left = col > 0 ? grid[row][col - 1].char : '';
            const right = col < screen.cols - 1 ? grid[row][col + 1].char : '';

            const hasTop = isVertical(top);
            const hasBottom = isVertical(bottom);
            const hasLeft = isHorizontal(left);
            const hasRight = isHorizontal(right);

            const key =
                (hasLeft ? 'L' : '') +
                (hasRight ? 'R' : '') +
                (hasTop ? 'T' : '') +
                (hasBottom ? 'B' : '');

            const merged = JUNCTIONS[key as keyof typeof JUNCTIONS];

            if (merged) {
                cell.char = merged;
            }
        }
    }
}