import { Screen } from '../../packages/core/src/terminal/Screen.js';

/** Create a test screen with default dimensions */
export function createTestScreen(cols = 80, rows = 24): Screen {
    return new Screen(cols, rows);
}

/** Extract visible text from a screen row */
export function readRow(screen: Screen, row: number): string {
    let text = '';
    for (let col = 0; col < screen.cols; col++) {
        const cell = screen.back[row][col];
        if (cell.width > 0) text += cell.char;
    }
    return text.trimEnd();
}

/** Snapshot: convert entire screen to a string */
export function screenToString(screen: Screen): string {
    const lines: string[] = [];
    for (let row = 0; row < screen.rows; row++) {
        lines.push(readRow(screen, row));
    }
    while (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines.join('\n');
}
