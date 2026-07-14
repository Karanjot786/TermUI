// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Scrollbar widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen, ScrollbarSets } from '@termuijs/core';
import { Scrollbar } from './Scrollbar.js';

describe('Scrollbar', () => {
    it('does not render if contentLength <= viewportLength', () => {
        const screen = new Screen(10, 10);
        const sb = new Scrollbar({}, {
            contentLength: 10,
            viewportLength: 10,
            orientation: 'verticalRight',
        });
        sb.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        sb.render(screen);

        // Grid should remain empty (all empty characters)
        const allChars = screen.back.flat().map(c => c.char).join('').trim();
        expect(allChars).toBe('');
    });

    it('renders verticalRight scrollbar with arrows', () => {
        const screen = new Screen(5, 5);
        const sb = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 20,
            orientation: 'verticalRight',
            showArrows: true,
        });
        sb.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        sb.render(screen);

        // Rightmost column (index 4) should have the scrollbar cells
        const column4 = screen.back.map(row => row[4].char).join('');
        const vertical = ScrollbarSets.VERTICAL;

        expect(column4[0]).toBe(vertical.begin);
        expect(column4[4]).toBe(vertical.end);
        expect(column4).toContain(vertical.thumb);
        expect(column4).toContain(vertical.track);
    });

    it('renders horizontalBottom scrollbar with arrows', () => {
        const screen = new Screen(5, 5);
        const sb = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 20,
            orientation: 'horizontalBottom',
            showArrows: true,
        });
        sb.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        sb.render(screen);

        // Bottom row (index 4) should have the scrollbar cells
        const row4 = screen.back[4].map(cell => cell.char).join('');
        const horizontal = ScrollbarSets.HORIZONTAL;

        expect(row4[0]).toBe(horizontal.begin);
        expect(row4[4]).toBe(horizontal.end);
        expect(row4).toContain(horizontal.thumb);
        expect(row4).toContain(horizontal.track);
    });

    it('renders without arrows when showArrows is false', () => {
        const screen = new Screen(5, 5);
        const sb = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 20,
            orientation: 'verticalRight',
            showArrows: false,
        });
        sb.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        sb.render(screen);

        const column4 = screen.back.map(row => row[4].char).join('');
        const vertical = ScrollbarSets.VERTICAL;

        expect(column4[0]).not.toBe(vertical.begin);
        expect(column4[4]).not.toBe(vertical.end);
        expect(column4).toContain(vertical.thumb);
        expect(column4).toContain(vertical.track);
    });

    it('updates position and triggers re-render', () => {
        const screen = new Screen(5, 5);
        const sb = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 20,
            position: 0,
            orientation: 'verticalRight',
            showArrows: false,
        });
        sb.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        sb.render(screen);

        const firstRender = screen.back.map(row => row[4].char).join('');

        // Move to the bottom scroll position
        sb.setPosition(80);
        
        // Clear screen and render again
        const freshScreen = new Screen(5, 5);
        sb.render(freshScreen);
        const secondRender = freshScreen.back.map(row => row[4].char).join('');

        expect(firstRender).not.toBe(secondRender);
    });

    it('updates contentLength and viewportLength', () => {
        const sb = new Scrollbar({}, {
            contentLength: 100,
            viewportLength: 20,
        });
        const markDirtySpy = vi.spyOn(sb, 'markDirty');

        sb.setContentLength(150);
        expect(markDirtySpy).toHaveBeenCalledTimes(1);

        sb.setViewportLength(30);
        expect(markDirtySpy).toHaveBeenCalledTimes(2);
    });
});
