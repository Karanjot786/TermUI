// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for DiffView widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { DiffView, type DiffLine } from './DiffView.js';

// ── Helpers ──────────────────────────────────────────

function makeDiffView(
    lines: DiffLine[],
    width = 40,
    height = 20,
    showLineNumbers = false,
): DiffView {
    const view = new DiffView({ lines, showLineNumbers });
    view.updateRect({ x: 0, y: 0, width, height });
    return view;
}

function renderDiffView(view: DiffView, width = 40, height = 20): Screen {
    const screen = new Screen(width, height);
    view.updateRect({ x: 0, y: 0, width, height });
    view.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

function rowFg(screen: Screen, row: number, col: number): unknown {
    return screen.back[row]?.[col]?.fg;
}

function rowDim(screen: Screen, row: number, col: number): boolean {
    return screen.back[row]?.[col]?.dim ?? false;
}

// ── Fixtures ─────────────────────────────────────────

function makeLines(): DiffLine[] {
    return [
        { type: 'add',     content: 'added line',   lineNo: 1 },
        { type: 'remove',  content: 'removed line',  lineNo: 2 },
        { type: 'context', content: 'context line',  lineNo: 3 },
    ];
}

// ── Tests ─────────────────────────────────────────────

describe('DiffView', () => {

    describe('1. Add lines render with + prefix and green fg', () => {
        it('renders + prefix for add lines', () => {
            const view = makeDiffView(makeLines());
            const screen = renderDiffView(view);

            const row = rowText(screen, 0);
            expect(row).toContain('+');
            expect(row).toContain('added line');
        });

        it('add line has green fg on prefix character', () => {
            const view = makeDiffView(makeLines());
            const screen = renderDiffView(view);

            // col 0 is the '+' prefix (showLineNumbers=false)
            const fg = rowFg(screen, 0, 0) as { type: string; name: string } | undefined;
            expect(fg).toBeDefined();
            expect(fg?.type).toBe('named');
            expect(fg?.name).toBe('green');
        });
    });

    describe('2. Remove lines render with - prefix and red fg', () => {
        it('renders - prefix for remove lines', () => {
            const view = makeDiffView(makeLines());
            const screen = renderDiffView(view);

            const row = rowText(screen, 1);
            expect(row).toContain('-');
            expect(row).toContain('removed line');
        });

        it('remove line has red fg on prefix character', () => {
            const view = makeDiffView(makeLines());
            const screen = renderDiffView(view);

            // col 0 is the '-' prefix (showLineNumbers=false)
            const fg = rowFg(screen, 1, 0) as { type: string; name: string } | undefined;
            expect(fg).toBeDefined();
            expect(fg?.type).toBe('named');
            expect(fg?.name).toBe('red');
        });
    });

    describe('3. Context lines render with space prefix and dim style', () => {
        it('renders space prefix for context lines', () => {
            const view = makeDiffView(makeLines());
            const screen = renderDiffView(view);

            const row = rowText(screen, 2);
            // first char should be a space (prefix)
            expect(row[0]).toBe(' ');
            expect(row).toContain('context line');
        });

        it('context line cells are dim', () => {
            const view = makeDiffView(makeLines());
            const screen = renderDiffView(view);

            // col 0 is the ' ' prefix (showLineNumbers=false)
            expect(rowDim(screen, 2, 0)).toBe(true);
            // content area (col 1) is also dim
            expect(rowDim(screen, 2, 1)).toBe(true);
        });
    });

    describe('4. ArrowDown scrolls down', () => {
        it('increases scrollOffset by 1', () => {
            const lines = Array.from({ length: 10 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            const view = makeDiffView(lines, 40, 5);

            expect((view as any)._scrollOffset).toBe(0);
            view.handleKey('down');
            expect((view as any)._scrollOffset).toBe(1);
        });

        it('j key also scrolls down', () => {
            const lines = Array.from({ length: 10 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            const view = makeDiffView(lines, 40, 5);

            view.handleKey('j');
            expect((view as any)._scrollOffset).toBe(1);
        });

        it('does not scroll past the last page', () => {
            const lines = Array.from({ length: 3 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            // height=5 > lines=3, so maxOffset=0
            const view = makeDiffView(lines, 40, 5);

            view.handleKey('down');
            expect((view as any)._scrollOffset).toBe(0);
        });
    });

    describe('5. ArrowUp scrolls up and does not go below 0', () => {
        it('decreases scrollOffset by 1', () => {
            const lines = Array.from({ length: 10 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            const view = makeDiffView(lines, 40, 5);

            view.handleKey('down');
            view.handleKey('down');
            expect((view as any)._scrollOffset).toBe(2);

            view.handleKey('up');
            expect((view as any)._scrollOffset).toBe(1);
        });

        it('k key also scrolls up', () => {
            const lines = Array.from({ length: 10 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            const view = makeDiffView(lines, 40, 5);

            view.handleKey('j');
            view.handleKey('j');
            view.handleKey('k');
            expect((view as any)._scrollOffset).toBe(1);
        });

        it('does not go below 0', () => {
            const lines = makeLines();
            const view = makeDiffView(lines, 40, 5);

            expect((view as any)._scrollOffset).toBe(0);
            view.handleKey('up');
            expect((view as any)._scrollOffset).toBe(0);
        });
    });

    describe('6. End scrolls to last visible position', () => {
        it('End key sets scrollOffset to maxOffset', () => {
            const lines = Array.from({ length: 10 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            // height=5, lines=10, maxOffset=5
            const view = makeDiffView(lines, 40, 5);

            view.handleKey('end');
            expect((view as any)._scrollOffset).toBe(5);
        });

        it('Home key resets scrollOffset to 0', () => {
            const lines = Array.from({ length: 10 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            const view = makeDiffView(lines, 40, 5);

            view.handleKey('end');
            view.handleKey('home');
            expect((view as any)._scrollOffset).toBe(0);
        });
    });

    describe('7. setLines() resets scroll to 0', () => {
        it('resets scrollOffset when new lines are set', () => {
            const lines = Array.from({ length: 10 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            const view = makeDiffView(lines, 40, 5);

            view.handleKey('end');
            expect((view as any)._scrollOffset).toBe(5);

            const newLines: DiffLine[] = [
                { type: 'add', content: 'fresh line' },
            ];
            view.setLines(newLines);

            expect((view as any)._scrollOffset).toBe(0);
            expect((view as any)._lines).toEqual(newLines);
        });
    });

    describe('showLineNumbers', () => {
        it('renders line number in gutter when showLineNumbers=true', () => {
            const lines: DiffLine[] = [
                { type: 'add', content: 'hello', lineNo: 42 },
            ];
            const view = new DiffView({ lines, showLineNumbers: true, gutterWidth: 5 });
            const screen = renderDiffView(view, 40, 10);

            const row = rowText(screen, 0);
            expect(row).toContain('42');
            expect(row).toContain('+');
            expect(row).toContain('hello');
        });

        it('renders blank gutter when lineNo is absent', () => {
            const lines: DiffLine[] = [
                { type: 'context', content: 'no line number' },
            ];
            const view = new DiffView({ lines, showLineNumbers: true, gutterWidth: 5 });
            const screen = renderDiffView(view, 40, 10);

            const row = rowText(screen, 0);
            // gutter should be spaces — line number not present
            expect(row).not.toMatch(/^\d/);
            expect(row).toContain('no line number');
        });
    });

    describe('PageUp / PageDown', () => {
        it('PageDown scrolls by visibleHeight', () => {
            const lines = Array.from({ length: 20 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            const view = makeDiffView(lines, 40, 5);

            view.handleKey('pagedown');
            expect((view as any)._scrollOffset).toBe(5);
        });

        it('PageUp scrolls back by visibleHeight', () => {
            const lines = Array.from({ length: 20 }, (_, i): DiffLine => ({
                type: 'context',
                content: `line ${i}`,
            }));
            const view = makeDiffView(lines, 40, 5);

            view.handleKey('pagedown');
            view.handleKey('pagedown');
            view.handleKey('pageup');
            expect((view as any)._scrollOffset).toBe(5);
        });
    });
});
