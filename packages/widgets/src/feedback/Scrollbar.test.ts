// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Scrollbar widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen, ScrollbarSets } from '@termuijs/core';
import { Scrollbar } from './Scrollbar.js';

describe('Scrollbar Widget — Initialization', () => {
    it('should initialize with provided options and default style', () => {
        const bar = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 10,
            position: 5,
            orientation: 'verticalLeft',
            showArrows: false,
        });

        expect(bar).toBeDefined();
        expect(bar.isDirty).toBe(true); // Starts dirty
    });

    it('should fall back to defaults for missing optional options', () => {
        const bar = new Scrollbar({}, {
            contentLength: 50,
            viewportLength: 10,
        });

        expect(bar).toBeDefined();
    });
});

describe('Scrollbar Widget — Rendering Edge Cases', () => {
    it('does not render if contentLength <= viewportLength', () => {
        const scrollbar = new Scrollbar({}, {
            contentLength: 10,
            viewportLength: 10,
        });
        scrollbar.updateRect({ x: 0, y: 0, width: 1, height: 10 });
        const screen = new Screen(1, 10);
        scrollbar.render(screen);

        const cells = screen.back.flat().map(c => c.char);
        expect(cells.every(c => c === ' ')).toBe(true);
    });

    it('should not render anything if width or height <= 0', () => {
        const bar = new Scrollbar({}, {
            contentLength: 20,
            viewportLength: 10,
            orientation: 'verticalRight',
        });
        bar.updateRect({ x: 0, y: 0, width: 0, height: 10 });
        const screen = new Screen(10, 10);
        bar.render(screen);

        const allChars = screen.back.flat().map(c => c.char).join('');
        expect(allChars.trim()).toBe('');
    });
});

describe('Scrollbar Widget — Rendering Layouts', () => {
    it('renders verticalRight mode with arrows correctly', () => {
        const scrollbar = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 10,
            orientation: 'verticalRight',
            showArrows: true,
        });
        // 10 high, verticalRight should be on the right edge of the rect
        scrollbar.updateRect({ x: 0, y: 0, width: 2, height: 10 });
        const screen = new Screen(2, 10);
        scrollbar.render(screen);

        const rightColumn = screen.back.map(row => row[1].char);
        const leftColumn = screen.back.map(row => row[0].char);

        expect(leftColumn.every(c => c === ' ')).toBe(true);
        expect(rightColumn[0]).toBe(ScrollbarSets.VERTICAL.begin);
        expect(rightColumn[9]).toBe(ScrollbarSets.VERTICAL.end);
        expect(rightColumn.filter(c => c === ScrollbarSets.VERTICAL.thumb).length).toBeGreaterThan(0);
        expect(rightColumn.filter(c => c === ScrollbarSets.VERTICAL.track).length).toBeGreaterThan(0);
    });

    it('should render verticalRight layout with arrows correctly (detailed coordinate checks)', () => {
        const bar = new Scrollbar({}, {
            contentLength: 20,
            viewportLength: 10,
            position: 0,
            orientation: 'verticalRight',
            showArrows: true,
        });

        bar.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        const screen = new Screen(10, 10);
        bar.render(screen);

        expect(screen.back[0][9].char).toBe('↑');
        expect(screen.back[9][9].char).toBe('↓');
        expect(screen.back[1][9].char).toBe('█');
        expect(screen.back[2][9].char).toBe('█');
        expect(screen.back[3][9].char).toBe('█');
        expect(screen.back[4][9].char).toBe('█');
        expect(screen.back[5][9].char).toBe('│');
        expect(screen.back[8][9].char).toBe('│');
        expect(screen.back[0][0].char).toBe(' ');
    });

    it('renders verticalLeft mode with arrows correctly', () => {
        const scrollbar = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 10,
            orientation: 'verticalLeft',
            showArrows: true,
        });
        scrollbar.updateRect({ x: 0, y: 0, width: 2, height: 10 });
        const screen = new Screen(2, 10);
        scrollbar.render(screen);

        const leftColumn = screen.back.map(row => row[0].char);
        const rightColumn = screen.back.map(row => row[1].char);

        expect(rightColumn.every(c => c === ' ')).toBe(true);
        expect(leftColumn[0]).toBe(ScrollbarSets.VERTICAL.begin);
        expect(leftColumn[9]).toBe(ScrollbarSets.VERTICAL.end);
        expect(leftColumn.filter(c => c === ScrollbarSets.VERTICAL.thumb).length).toBeGreaterThan(0);
    });

    it('should render verticalLeft layout without arrows correctly (detailed coordinate checks)', () => {
        const bar = new Scrollbar({}, {
            contentLength: 20,
            viewportLength: 10,
            position: 5,
            orientation: 'verticalLeft',
            showArrows: false,
        });

        bar.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        const screen = new Screen(10, 10);
        bar.render(screen);

        expect(screen.back[0][0].char).toBe('│');
        expect(screen.back[1][0].char).toBe('│');
        expect(screen.back[2][0].char).toBe('█');
        expect(screen.back[3][0].char).toBe('█');
        expect(screen.back[4][0].char).toBe('█');
        expect(screen.back[5][0].char).toBe('█');
        expect(screen.back[6][0].char).toBe('█');
        expect(screen.back[7][0].char).toBe('│');
        expect(screen.back[9][0].char).toBe('│');
        expect(screen.back[0][9].char).toBe(' ');
    });

    it('renders horizontalBottom mode with arrows correctly', () => {
        const scrollbar = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 10,
            orientation: 'horizontalBottom',
            showArrows: true,
        });
        scrollbar.updateRect({ x: 0, y: 0, width: 10, height: 2 });
        const screen = new Screen(10, 2);
        scrollbar.render(screen);

        const bottomRow = screen.back[1].map(c => c.char);
        const topRow = screen.back[0].map(c => c.char);

        expect(topRow.every(c => c === ' ')).toBe(true);
        expect(bottomRow[0]).toBe(ScrollbarSets.HORIZONTAL.begin);
        expect(bottomRow[9]).toBe(ScrollbarSets.HORIZONTAL.end);
        expect(bottomRow.filter(c => c === ScrollbarSets.HORIZONTAL.thumb).length).toBeGreaterThan(0);
    });

    it('should render horizontalBottom layout correctly (detailed coordinate checks)', () => {
        const bar = new Scrollbar({}, {
            contentLength: 30,
            viewportLength: 10,
            position: 10,
            orientation: 'horizontalBottom',
            showArrows: true,
        });

        bar.updateRect({ x: 0, y: 0, width: 12, height: 10 });
        const screen = new Screen(12, 10);
        bar.render(screen);

        expect(screen.back[9][0].char).toBe('←');
        expect(screen.back[9][11].char).toBe('→');
        expect(screen.back[9][1].char).toBe('─');
        expect(screen.back[9][4].char).toBe('█');
        expect(screen.back[9][5].char).toBe('█');
        expect(screen.back[9][6].char).toBe('█');
        expect(screen.back[9][7].char).toBe('─');
        expect(screen.back[9][10].char).toBe('─');
    });

    it('renders horizontalTop mode with arrows correctly', () => {
        const scrollbar = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 10,
            orientation: 'horizontalTop',
            showArrows: true,
        });
        scrollbar.updateRect({ x: 0, y: 0, width: 10, height: 2 });
        const screen = new Screen(10, 2);
        scrollbar.render(screen);

        const topRow = screen.back[0].map(c => c.char);
        const bottomRow = screen.back[1].map(c => c.char);

        expect(bottomRow.every(c => c === ' ')).toBe(true);
        expect(topRow[0]).toBe(ScrollbarSets.HORIZONTAL.begin);
        expect(topRow[9]).toBe(ScrollbarSets.HORIZONTAL.end);
    });

    it('should render horizontalTop layout without arrows correctly (detailed coordinate checks)', () => {
        const bar = new Scrollbar({}, {
            contentLength: 20,
            viewportLength: 10,
            position: 0,
            orientation: 'horizontalTop',
            showArrows: false,
        });

        bar.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        const screen = new Screen(10, 10);
        bar.render(screen);

        expect(screen.back[0][0].char).toBe('█');
        expect(screen.back[0][4].char).toBe('█');
        expect(screen.back[0][5].char).toBe('─');
        expect(screen.back[0][9].char).toBe('─');
        expect(screen.back[9][0].char).toBe(' ');
    });
});

describe('Scrollbar Widget — Layout Operations', () => {
    it('toggles arrows correctly', () => {
        const withArrows = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 10,
            showArrows: true,
        });
        const withoutArrows = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 10,
            showArrows: false,
        });

        const screen1 = new Screen(1, 10);
        withArrows.updateRect({ x: 0, y: 0, width: 1, height: 10 });
        withArrows.render(screen1);
        expect(screen1.back[0][0].char).toBe(ScrollbarSets.VERTICAL.begin);

        const screen2 = new Screen(1, 10);
        withoutArrows.updateRect({ x: 0, y: 0, width: 1, height: 10 });
        withoutArrows.render(screen2);
        expect(screen2.back[0][0].char).not.toBe(ScrollbarSets.VERTICAL.begin);
        expect(screen2.back[0][0].char).toBe(ScrollbarSets.VERTICAL.thumb);
    });

    it('changes thumb offset proportionally with setPosition', () => {
        const scrollbar = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 20,
            position: 0,
            showArrows: false,
        });
        scrollbar.updateRect({ x: 0, y: 0, width: 1, height: 10 });
        const screen = new Screen(1, 10);

        // Position 0
        scrollbar.render(screen);
        let column = screen.back.map(row => row[0].char);
        expect(column[0]).toBe(ScrollbarSets.VERTICAL.thumb);

        // Position at 50%
        scrollbar.setPosition(40); // (100 - 20) / 2 = 40
        scrollbar.render(screen);
        column = screen.back.map(row => row[0].char);
        expect(column[4]).toBe(ScrollbarSets.VERTICAL.thumb);
        expect(column[5]).toBe(ScrollbarSets.VERTICAL.thumb);
        expect(column[3]).toBe(ScrollbarSets.VERTICAL.track);
        expect(column[6]).toBe(ScrollbarSets.VERTICAL.track);

        // Position at 100%
        scrollbar.setPosition(80);
        scrollbar.render(screen);
        column = screen.back.map(row => row[0].char);
        expect(column[8]).toBe(ScrollbarSets.VERTICAL.thumb);
        expect(column[9]).toBe(ScrollbarSets.VERTICAL.thumb);
    });

    it('setters call markDirty', () => {
        const scrollbar = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 10,
        });
        const spy = vi.spyOn(scrollbar, 'markDirty');

        scrollbar.setPosition(50);
        expect(spy).toHaveBeenCalledTimes(1);

        scrollbar.setContentLength(200);
        expect(spy).toHaveBeenCalledTimes(2);

        scrollbar.setViewportLength(20);
        expect(spy).toHaveBeenCalledTimes(3);
    });
});
