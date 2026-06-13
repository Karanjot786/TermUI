// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Breadcrumb
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps, createKeyEvent } from '@termuijs/core';
import { Breadcrumb } from './Breadcrumb.js';

afterEach(() => {
    vi.restoreAllMocks();
});

const keyOf = (key: string): ReturnType<typeof createKeyEvent> =>
    createKeyEvent({ key, raw: Buffer.from(key), ctrl: false, alt: false, shift: false });

const rowText = (screen: Screen, row: number): string =>
    screen.back[row].map(c => c.char).join('');

describe('Breadcrumb', () => {
    it('renders all items in order separated by a separator', () => {
        const breadcrumb = new Breadcrumb({
            items: [
                { label: 'Home' },
                { label: 'Projects' },
                { label: 'TermUI' },
            ],
        });
        breadcrumb.updateRect({ x: 0, y: 0, width: 30, height: 1 });
        const screen = new Screen(30, 1);
        breadcrumb.render(screen);

        const row = rowText(screen, 0);
        expect(row).toContain('Home');
        expect(row).toContain('Projects');
        expect(row).toContain('TermUI');
        // Unicode separator: ›
        expect(row).toContain('›');
    });

    it('uses ASCII separator when unicode is off', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const breadcrumb = new Breadcrumb({
            items: [
                { label: 'A' },
                { label: 'B' },
                { label: 'C' },
            ],
        });
        breadcrumb.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        breadcrumb.render(screen);

        const row = rowText(screen, 0);
        expect(row).toContain('>');
        expect(row).not.toContain('›');
    });

    it('renders the last item in a distinct (bold) style', () => {
        const breadcrumb = new Breadcrumb({
            items: [
                { label: 'Home' },
                { label: 'Projects' },
                { label: 'TermUI' },
            ],
        });
        breadcrumb.updateRect({ x: 0, y: 0, width: 30, height: 1 });
        const screen = new Screen(30, 1);
        breadcrumb.render(screen);

        // Find the column of the last item's first character
        const row = screen.back[0];
        const lastItemStart = rowText(screen, 0).lastIndexOf('TermUI');
        expect(lastItemStart).toBeGreaterThanOrEqual(0);
        const firstCell = row[lastItemStart];
        expect(firstCell).toBeDefined();
        expect(firstCell?.bold).toBe(true);

        // A non-last item should not be bold
        const firstItemStart = rowText(screen, 0).indexOf('Home');
        const firstCellOfFirst = row[firstItemStart];
        expect(firstCellOfFirst?.bold).not.toBe(true);
    });

    it('left/right arrows move focus and Enter fires onSelect', () => {
        const onHome = vi.fn();
        const onProjects = vi.fn();
        const breadcrumb = new Breadcrumb({
            items: [
                { label: 'Home', onSelect: onHome },
                { label: 'Projects', onSelect: onProjects },
                { label: 'TermUI' },
            ],
        });

        expect(breadcrumb.focusedIndex).toBe(0);
        breadcrumb.handleKey(keyOf('right'));
        expect(breadcrumb.focusedIndex).toBe(1);
        breadcrumb.handleKey(keyOf('enter'));
        expect(onProjects).toHaveBeenCalledTimes(1);
        expect(onHome).not.toHaveBeenCalled();

        // Left wraps
        breadcrumb.handleKey(keyOf('left'));
        breadcrumb.handleKey(keyOf('left'));
        expect(breadcrumb.focusedIndex).toBe(2);
    });
});
