// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Clock widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { Clock } from './Clock.js';

describe('Clock', () => {
    it('setTime(new Date("2026-06-02T14:30:45")) renders 14:30:45 in 24h mode', () => {
        const clock = new Clock({ width: 50, height: 3 }, { use24Hour: true, showSeconds: true });
        clock.setTime(new Date('2026-06-02T14:30:45'));

        clock.updateRect({ x: 0, y: 0, width: 50, height: 3 });
        const screen = new Screen(50, 3);
        clock.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));

        // Assert that the screen does not contain 'PM' or 'AM' since it's 24h mode
        expect(rows.some(row => row.includes('PM') || row.includes('AM'))).toBe(false);

        // 14:30:45 has length 8. At 5 columns per digit, it should render up to column 39.
        // Verify that there are non-empty characters inside columns 25-39.
        const midRowSnippet = rows[1].slice(25, 40);
        expect(midRowSnippet.trim().length).toBeGreaterThan(0);
    });

    it('showSeconds:false renders 14:30 and omits seconds', () => {
        const clock = new Clock({ width: 50, height: 3 }, { use24Hour: true, showSeconds: false });
        clock.setTime(new Date('2026-06-02T14:30:45'));

        clock.updateRect({ x: 0, y: 0, width: 50, height: 3 });
        const screen = new Screen(50, 3);
        clock.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));

        // 14:30 has length 5. At 5 columns per digit, it should only render up to column 24.
        // Columns 25 onwards should be completely empty/spaces.
        for (const row of rows) {
            const rightSnippet = row.slice(25);
            expect(rightSnippet.trim()).toBe('');
        }

        // Verify there is visible content before column 24
        expect(rows[1].slice(0, 24).trim().length).toBeGreaterThan(0);
    });

    it('use24Hour:false converts 14:30:45 to 2:30:45 PM', () => {
        const clock = new Clock({ width: 50, height: 3 }, { use24Hour: false, showSeconds: true });
        clock.setTime(new Date('2026-06-02T14:30:45'));

        clock.updateRect({ x: 0, y: 0, width: 50, height: 3 });
        const screen = new Screen(50, 3);
        clock.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));

        // Assert that the 'PM' label is rendered on the screen (row 2)
        expect(rows[2]).toContain('PM');

        // 2:30:45 has length 7. PM should start exactly at index 35.
        expect(rows[2].slice(35, 37)).toBe('PM');
    });

    it('use24Hour:false converts 09:15:30 to 9:15:30 AM', () => {
        const clock = new Clock({ width: 50, height: 3 }, { use24Hour: false, showSeconds: true });
        clock.setTime(new Date('2026-06-02T09:15:30'));

        clock.updateRect({ x: 0, y: 0, width: 50, height: 3 });
        const screen = new Screen(50, 3);
        clock.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));

        // Assert that the 'AM' label is rendered on the screen (row 2)
        expect(rows[2]).toContain('AM');

        // 9:15:30 has length 7. AM should start exactly at index 35.
        expect(rows[2].slice(35, 37)).toBe('AM');
    });

    it('use24Hour:false converts 00:05:10 to 12:05:10 AM', () => {
        const clock = new Clock({ width: 50, height: 3 }, { use24Hour: false, showSeconds: true });
        clock.setTime(new Date('2026-06-02T00:05:10'));

        clock.updateRect({ x: 0, y: 0, width: 50, height: 3 });
        const screen = new Screen(50, 3);
        clock.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));
        expect(rows[2]).toContain('AM');
        // 12:05:10 has length 8. AM should start exactly at index 40.
        expect(rows[2].slice(40, 42)).toBe('AM');
    });

    it('use24Hour:false converts 12:05:10 to 12:05:10 PM', () => {
        const clock = new Clock({ width: 50, height: 3 }, { use24Hour: false, showSeconds: true });
        clock.setTime(new Date('2026-06-02T12:05:10'));

        clock.updateRect({ x: 0, y: 0, width: 50, height: 3 });
        const screen = new Screen(50, 3);
        clock.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));
        expect(rows[2]).toContain('PM');
        // 12:05:10 has length 8. PM should start exactly at index 40.
        expect(rows[2].slice(40, 42)).toBe('PM');
    });

    it('setTime triggers markDirty()', () => {
        const clock = new Clock({ width: 50, height: 3 });
        const spy = vi.spyOn(clock, 'markDirty');
        clock.setTime(new Date());
        expect(spy).toHaveBeenCalled();
    });
});
