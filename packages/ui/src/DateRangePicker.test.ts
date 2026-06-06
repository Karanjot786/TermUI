import { describe, it, expect, vi, afterEach } from 'vitest';
import { DateRangePicker } from './DateRangePicker.js';
import { Screen, caps, type KeyEvent } from '@termuijs/core';

const makeKeyEvent = (key: string): KeyEvent => ({
    key,
    raw: Buffer.alloc(0),
    ctrl: false,
    alt: false,
    shift: false,
    stopPropagation: () => {},
    preventDefault: () => {}
});

describe('DateRangePicker', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes with start and/or end dates and matches API contract', () => {
        const testStart = new Date(2026, 5, 1);
        const testEnd = new Date(2026, 5, 5);
        const picker = new DateRangePicker({ value: { start: testStart, end: testEnd } });

        expect(picker.range.start).toBeInstanceOf(Date);
        expect(picker.range.end).toBeInstanceOf(Date);
        expect(picker.range.start!.getDate()).toBe(1);
        expect(picker.range.end!.getDate()).toBe(5);
        expect(picker.focusable).toBe(true);
    });

    it('renders the month grid', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = new Screen(30, 10);
        const picker = new DateRangePicker({ value: { start: new Date(2026, 5, 1) } });
        picker.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        picker.render(screen);

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('◀ June 2026 ▶');
        
        const row2 = screen.back[2].map(c => c.char).join('');
        expect(row2).toContain('Su Mo Tu We Th Fr Sa');
    });

    it('first enter sets start, second enter sets end', () => {
        const onChange = vi.fn();
        const picker = new DateRangePicker({ onChange });
        // Set cursor to June 1, 2026
        (picker as any)._cursorDate = new Date(2026, 5, 1);
        (picker as any)._currentMonth = new Date(2026, 5, 1);

        // First enter sets start to June 1st
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(1);
        expect(picker.range.end).toBeUndefined();
        expect(onChange).toHaveBeenCalledWith({ start: expect.any(Date) });

        // Move cursor 4 days right -> June 5th
        for (let i = 0; i < 4; i++) {
            picker.handleKey(makeKeyEvent('right'));
        }
        // Second enter sets end date
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(1);
        expect(picker.range.end!.getDate()).toBe(5);
        expect(onChange).toHaveBeenLastCalledWith({
            start: expect.any(Date),
            end: expect.any(Date)
        });
    });

    it('days between start and end are highlighted', () => {
        const picker = new DateRangePicker({
            value: { start: new Date(2026, 5, 10), end: new Date(2026, 5, 12) }
        });
        picker.updateRect({ x: 0, y: 0, width: 30, height: 10 });

        const screen = new Screen(30, 10);
        picker.render(screen);

        // Grid starts on row 2
        // Find June 11th (between 10th and 12th)
        // June 1, 2026 is Monday.
        // Week 1: 1 (Mon) - 6 (Sat)
        // Week 2: 7 (Sun) - 13 (Sat)
        // June 10 is Wednesday (col index 3 of week 2), June 11 is Thursday (col index 4 of week 2), June 12 is Friday (col index 5 of week 2)
        // Week 2 row is y + 2 + 1 = y + 3. (Since content rect y = 1, y + 3 = 4)
        // June 11 col index is 4, which is x + weekdayX + 4 * 3.
        // Let's verify that June 11 cell is written with bg: 'cyan' and fg: 'black'.
        const weekdayX = Math.floor((30 - 'Su Mo Tu We Th Fr Sa'.length) / 2);
        const colX = weekdayX + 4 * 3;
        const rowY = 4;

        const cell = screen.back[rowY][colX];
        expect(cell.char).toBe('1'); // first digit of '11'
        expect(cell.fg).toEqual({ type: 'named', name: 'black' });
        expect(cell.bg).toEqual({ type: 'named', name: 'cyan' });
    });

    it('a third enter restarts the range', () => {
        const onChange = vi.fn();
        const picker = new DateRangePicker({
            value: { start: new Date(2026, 5, 10), end: new Date(2026, 5, 12) },
            onChange
        });

        // Initial cursor starts at start date (June 10).
        // First enter (which is third enter because start & end are already set) restarts range from cursor
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(10);
        expect(picker.range.end).toBeUndefined();
        expect(onChange).toHaveBeenCalledWith({ start: expect.any(Date) });
    });

    it('ASCII fallback renders when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = new Screen(30, 10);
        const picker = new DateRangePicker({ value: { start: new Date(2026, 5, 1) } });
        picker.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        picker.render(screen);

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('< June 2026 >');
    });

    it('accepts objective test from spec', () => {
        const screen = new Screen(30, 10);
        const drp = new DateRangePicker({ value: { start: new Date(2026, 5, 1) } });
        drp.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        drp.handleKey({ key: 'right' } as any);
        drp.handleKey({ key: 'enter' } as any);
        expect(drp.range.start).toBeInstanceOf(Date);
    });
});
