// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Calendar widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Calendar } from './Calendar.js';

describe('Calendar', () => {
    it('initializes with default date (today) and options', () => {
        const cal = new Calendar();
        const selected = cal.getSelectedDate();
        const today = new Date();
        expect(selected.getDate()).toBe(today.getDate());
        expect(selected.getMonth()).toBe(today.getMonth());
        expect(selected.getFullYear()).toBe(today.getFullYear());
    });

    it('renders month header and weekdays correctly', () => {
        const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2026, 5, 2) });
        cal.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        const screen = new Screen(30, 10);
        cal.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));
        expect(rows[0]).toContain('June 2026');
        expect(rows[1]).toContain('Su Mo Tu We Th Fr Sa');
    });

    it('uses non-unicode arrows when caps.unicode is false', () => {
        const spy = vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        try {
            const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2026, 5, 2) });
            cal.updateRect({ x: 0, y: 0, width: 30, height: 10 });
            const screen = new Screen(30, 10);
            cal.render(screen);

            const rows = screen.back.map(row => row.map(cell => cell.char).join(''));
            expect(rows[0]).toContain('< June 2026 >');
        } finally {
            spy.mockRestore();
        }
    });

    it('places a known date in the expected weekday column', () => {
        const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2026, 5, 1) }); // June 1, 2026 (Monday)
        cal.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        const screen = new Screen(30, 10);
        cal.render(screen);

        // Find the start of the weekdays header
        const weekdaysRow = screen.back[1].map(cell => cell.char).join('');
        const weekdayX = weekdaysRow.indexOf('Su Mo Tu We Th Fr Sa');
        expect(weekdayX).toBeGreaterThanOrEqual(0);

        // Monday is the second column (index 1 of 0-6).
        // The column starts at weekdayX + 1 * 3 = weekdayX + 3.
        // Label is ' 1', so X + 3 is space, X + 4 is '1'.
        expect(screen.back[2][weekdayX + 3].char).toBe(' ');
        expect(screen.back[2][weekdayX + 4].char).toBe('1');
    });

    it('navigates days with left/right keys', () => {
        const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2026, 5, 2) });

        // Move left: -1 day -> June 1, 2026
        cal.handleKey({ key: 'left' } as any);
        expect(cal.getSelectedDate().getDate()).toBe(1);

        // Move right: +1 day -> June 2, 2026
        cal.handleKey({ key: 'right' } as any);
        expect(cal.getSelectedDate().getDate()).toBe(2);
    });

    it('navigates weeks with up/down keys', () => {
        const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2026, 5, 10) });

        // Move up: -7 days -> June 3, 2026
        cal.handleKey({ key: 'up' } as any);
        expect(cal.getSelectedDate().getDate()).toBe(3);

        // Move down: +7 days -> June 10, 2026
        cal.handleKey({ key: 'down' } as any);
        expect(cal.getSelectedDate().getDate()).toBe(10);
    });

    it('wraps across month boundaries automatically during navigation', () => {
        const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2026, 5, 1) }); // June 1, 2026

        // Move left: -1 day -> May 31, 2026
        cal.handleKey({ key: 'left' } as any);
        const date = cal.getSelectedDate();
        expect(date.getFullYear()).toBe(2026);
        expect(date.getMonth()).toBe(4); // May is 4
        expect(date.getDate()).toBe(31);

        // Move right: +1 day -> June 1, 2026
        cal.handleKey({ key: 'right' } as any);
        expect(cal.getSelectedDate().getMonth()).toBe(5); // June is 5
        expect(cal.getSelectedDate().getDate()).toBe(1);
    });

    it('handles leap years correctly for February', () => {
        // Feb 28, 2024 (Leap year)
        const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2024, 1, 28) });

        // Move right: +1 day -> Feb 29, 2024
        cal.handleKey({ key: 'right' } as any);
        expect(cal.getSelectedDate().getDate()).toBe(29);

        // Move right: +1 day -> Mar 1, 2024
        cal.handleKey({ key: 'right' } as any);
        expect(cal.getSelectedDate().getMonth()).toBe(2); // March is 2
        expect(cal.getSelectedDate().getDate()).toBe(1);
    });

    it('triggers onSelect when enter is pressed', () => {
        const onSelect = vi.fn();
        const date = new Date(2026, 5, 2);
        const cal = new Calendar({ width: 30, height: 10 }, { date, onSelect });

        cal.handleKey({ key: 'enter' } as any);
        expect(onSelect).toHaveBeenCalled();
        expect(onSelect.mock.calls[0][0].getDate()).toBe(2);
    });

    it('applies selectedColor and focus states correctly', () => {
        const selectedColor = { type: 'named' as const, name: 'magenta' as const };
        const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2026, 5, 2), selectedColor });
        cal.updateRect({ x: 0, y: 0, width: 30, height: 10 });

        const screen1 = new Screen(30, 10);
        cal.isFocused = true;
        cal.render(screen1);

        // Verify selection highlights in focused state
        const weekdaysRow1 = screen1.back[1].map(cell => cell.char).join('');
        const weekdayX1 = weekdaysRow1.indexOf('Su Mo Tu We Th Fr Sa');
        // June 2 is Tuesday (d = 2). Column starts at weekdayX + 6. Label is ' 2'.
        // So cell at X + 7 contains '2'.
        const selectedCell1 = screen1.back[2][weekdayX1 + 7];
        expect(selectedCell1.char).toBe('2');
        expect(selectedCell1.fg).toEqual(selectedColor);
        expect(selectedCell1.bold).toBe(true);
        expect(selectedCell1.inverse).toBe(true);

        const screen2 = new Screen(30, 10);
        cal.isFocused = false;
        cal.render(screen2);

        // Verify selection highlights in unfocused state
        const weekdaysRow2 = screen2.back[1].map(cell => cell.char).join('');
        const weekdayX2 = weekdaysRow2.indexOf('Su Mo Tu We Th Fr Sa');
        const selectedCell2 = screen2.back[2][weekdayX2 + 7];
        expect(selectedCell2.char).toBe('2');
        expect(selectedCell2.fg).toEqual(selectedColor);
        expect(selectedCell2.bold).toBe(true);
        expect(selectedCell2.inverse).toBe(false);
        expect(selectedCell2.underline).toBe(true);
    });

    it('highlights today\'s date with todayColor and bold', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 2)); // June 2, 2026 is today
        try {
            const todayColor = { type: 'named' as const, name: 'green' as const };
            // Set selected date to June 1, 2026 so it doesn't conflict with today's highlight
            const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2026, 5, 1), todayColor });
            cal.updateRect({ x: 0, y: 0, width: 30, height: 10 });
            const screen = new Screen(30, 10);
            cal.render(screen);

            // June 2 is today. Monday is June 1st (d = 1), Tuesday is June 2nd (d = 2).
            // Column starts at weekdayX + 6. Cell at X + 7 contains '2'.
            const weekdaysRow = screen.back[1].map(cell => cell.char).join('');
            const weekdayX = weekdaysRow.indexOf('Su Mo Tu We Th Fr Sa');
            const todayCell = screen.back[2][weekdayX + 7];

            expect(todayCell.char).toBe('2');
            expect(todayCell.fg).toEqual(todayColor);
            expect(todayCell.bold).toBe(true);
            // Since it's not the selected date, it shouldn't be inversed or underlined
            expect(todayCell.inverse).toBe(false);
            expect(todayCell.underline).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it('marks widget dirty after navigation or setMonth', () => {
        const cal = new Calendar({ width: 30, height: 10 }, { date: new Date(2026, 5, 2) });

        cal.clearDirty();
        expect(cal.isDirty).toBe(false);

        cal.handleKey({ key: 'left' } as any);
        expect(cal.isDirty).toBe(true);

        cal.clearDirty();
        cal.setMonth(2027, 0);
        expect(cal.isDirty).toBe(true);
    });
});
