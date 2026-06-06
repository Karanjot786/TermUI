import { describe, it, expect, vi, afterEach } from 'vitest';
import { DateRangePicker } from './DateRangePicker.js';
import { Screen, caps, type KeyEvent } from '@termuijs/core';

// ─── helpers ────────────────────────────────────────────────────────────────

const makeKeyEvent = (key: string, extra: Partial<KeyEvent> = {}): KeyEvent => ({
    key,
    raw: Buffer.alloc(0),
    ctrl: false,
    alt: false,
    shift: false,
    stopPropagation: () => {},
    preventDefault: () => {},
    ...extra,
});

/** Return the rendered text of a screen row as a plain string. */
const rowText = (screen: Screen, row: number): string =>
    screen.back[row].map(c => c.char).join('');

/**
 * Standard 30×10 screen + picker.
 * The border is 1 cell wide so content rect starts at x=1, y=1.
 */
const makeScreen = (): Screen => new Screen(30, 10);

const setupPicker = (
    picker: DateRangePicker,
    screen: Screen = makeScreen()
): Screen => {
    picker.updateRect({ x: 0, y: 0, width: 30, height: 10 });
    picker.render(screen);
    return screen;
};

// ─── coordinate helpers (must match _renderSelf logic) ──────────────────────
// content rect: x=1, y=1, width=28, height=8
// weekdayX = 1 + floor((28-20)/2) = 1 + 4 = 5
// gridStartY = y+2 = 3  (content y=1, header row=1, weekday row=2, grid from 3)
const CONTENT_X = 1;
const CONTENT_Y = 1;
const CONTENT_W = 28;
const WEEKDAY_STR = 'Su Mo Tu We Th Fr Sa';
const WEEKDAY_X = CONTENT_X + Math.floor((CONTENT_W - WEEKDAY_STR.length) / 2); // 5
const GRID_START_Y = CONTENT_Y + 2; // 3

/** x-position of column d (0-indexed Sunday..Saturday) in the grid. */
const colX = (d: number): number => WEEKDAY_X + d * 3;

/**
 * Find the grid row + column for a given day-of-month in a month starting on
 * `firstDOW` (0=Sunday).
 */
const dayPos = (day: number, firstDOW: number): { row: number; col: number } => {
    const idx = day - 1 + firstDOW; // 0-based index in the 7×6 grid
    return { row: Math.floor(idx / 7), col: idx % 7 };
};

// ─────────────────────────────────────────────────────────────────────────────
describe('DateRangePicker', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── EXISTING TESTS (preserved exactly) ──────────────────────────────────

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
        const colXPos = weekdayX + 4 * 3;
        const rowY = 4;

        const cell = screen.back[rowY][colXPos];
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

    // ── NEW TESTS ────────────────────────────────────────────────────────────

    // 1. Default Initialization
    it('default initialization sets no range and is focusable', () => {
        const picker = new DateRangePicker();
        expect(picker.focusable).toBe(true);
        expect(picker.range.start).toBeUndefined();
        expect(picker.range.end).toBeUndefined();
    });

    // 2. Initialization with start date only
    it('initializes with start date only, cursor set to start', () => {
        const start = new Date(2026, 5, 10);
        const picker = new DateRangePicker({ value: { start } });
        expect(picker.range.start).toBeInstanceOf(Date);
        expect(picker.range.start!.getDate()).toBe(10);
        expect(picker.range.start!.getMonth()).toBe(5);
        expect(picker.range.end).toBeUndefined();

        // cursor initializes from start — navigate right moves from June 10 to June 11
        picker.handleKey(makeKeyEvent('right'));
        picker.handleKey(makeKeyEvent('enter'));
        // start-set → picks June 11 as end
        expect(picker.range.end!.getDate()).toBe(11);
    });

    // 3. Initialization with end date only
    it('initializes with end date only, cursor set to end', () => {
        const end = new Date(2026, 5, 20);
        const picker = new DateRangePicker({ value: { end } });
        expect(picker.range.end).toBeInstanceOf(Date);
        expect(picker.range.end!.getDate()).toBe(20);
        expect(picker.range.end!.getMonth()).toBe(5);
        expect(picker.range.start).toBeUndefined();

        // cursor initializes from end date — first enter sets start at June 20
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(20);
    });

    // 4. Getter returns defensive copies
    it('range getter returns defensive copies — mutations do not affect internal state', () => {
        const picker = new DateRangePicker({
            value: {
                start: new Date(2026, 5, 10),
                end: new Date(2026, 5, 20),
            },
        });

        const range = picker.range;
        range.start?.setDate(99);
        range.end?.setDate(99);

        // Internal state must be unchanged
        expect(picker.range.start!.getDate()).toBe(10);
        expect(picker.range.end!.getDate()).toBe(20);
    });

    // 5. Move selection across to next year (Dec 31 → Jan 1)
    it('right from Dec 31 moves into next year', () => {
        // Start with a fresh picker so selectionState='none'
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 11, 31);
        (picker as any)._currentMonth = new Date(2026, 11, 1);
        picker.handleKey(makeKeyEvent('right'));

        // After moving right cursor is Jan 1 2027 — verify via first enter
        picker.handleKey(makeKeyEvent('enter'));
        const start = picker.range.start!;
        expect(start.getFullYear()).toBe(2027);
        expect(start.getMonth()).toBe(0); // January
        expect(start.getDate()).toBe(1);
    });

    // 6. Move selection across to previous year (Jan 1 → Dec 31)
    it('left from Jan 1 moves into previous year', () => {
        // Use a fresh picker so selectionState='none' and first enter = set start
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 0, 1);
        (picker as any)._currentMonth = new Date(2026, 0, 1);
        picker.handleKey(makeKeyEvent('left'));

        // Cursor is now Dec 31 2025; verify via first enter
        picker.handleKey(makeKeyEvent('enter'));
        const start = picker.range.start!;
        expect(start.getFullYear()).toBe(2025);
        expect(start.getMonth()).toBe(11); // December
        expect(start.getDate()).toBe(31);
    });

    // 7. Week navigation across month boundaries
    it('up from first days of month wraps to previous month', () => {
        // June 3, 2026 is a Wednesday; 7 days up → May 27
        // Use a fresh picker so first enter sets start
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 5, 3);
        (picker as any)._currentMonth = new Date(2026, 5, 1);
        picker.handleKey(makeKeyEvent('up'));

        picker.handleKey(makeKeyEvent('enter'));
        const start = picker.range.start!;
        expect(start.getMonth()).toBe(4); // May
        expect(start.getDate()).toBe(27);
    });

    it('down from last days of month wraps to next month', () => {
        // June 28, 2026; 7 down → July 5
        // Use a fresh picker so first enter sets start
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 5, 28);
        (picker as any)._currentMonth = new Date(2026, 5, 1);
        picker.handleKey(makeKeyEvent('down'));

        picker.handleKey(makeKeyEvent('enter'));
        const start = picker.range.start!;
        expect(start.getMonth()).toBe(6); // July
        expect(start.getDate()).toBe(5);
    });

    // 8. PageUp across year boundary (Jan → Dec previous year)
    it('pageup from January wraps to December of previous year', () => {
        // Fresh picker: state='none', first enter sets start
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 0, 15);
        (picker as any)._currentMonth = new Date(2026, 0, 1);
        picker.handleKey(makeKeyEvent('pageup'));

        picker.handleKey(makeKeyEvent('enter'));
        const start = picker.range.start!;
        expect(start.getFullYear()).toBe(2025);
        expect(start.getMonth()).toBe(11); // December
        expect(start.getDate()).toBe(15);
    });

    // 9. PageDown across year boundary (Dec → Jan next year)
    it('pagedown from December wraps to January of next year', () => {
        // Fresh picker: state='none', first enter sets start
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 11, 15);
        (picker as any)._currentMonth = new Date(2026, 11, 1);
        picker.handleKey(makeKeyEvent('pagedown'));

        picker.handleKey(makeKeyEvent('enter'));
        const start = picker.range.start!;
        expect(start.getFullYear()).toBe(2027);
        expect(start.getMonth()).toBe(0); // January
        expect(start.getDate()).toBe(15);
    });

    // 10. Leap-year: Feb 29 on pagedown stays valid (Mar 29)
    it('leap-year Feb 29 does not overflow on changeMonth(+1)', () => {
        // Fresh picker: manually set cursor to Feb 29 2024
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2024, 1, 29);
        (picker as any)._currentMonth = new Date(2024, 1, 1);
        // go to March (still 29 since March has 31 days)
        picker.handleKey(makeKeyEvent('pagedown'));
        picker.handleKey(makeKeyEvent('enter'));
        const result = picker.range.start!;
        expect(result.getMonth()).toBe(2); // March
        expect(result.getDate()).toBe(29); // valid, no rollover
    });

    // 11. Non-leap February clamp: Jan 31 → Feb 28
    it('clamps Jan 31 to Feb 28 on changeMonth(+1) in non-leap year', () => {
        // Fresh picker: manually set cursor to Jan 31 2025
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2025, 0, 31);
        (picker as any)._currentMonth = new Date(2025, 0, 1);
        picker.handleKey(makeKeyEvent('pagedown'));

        picker.handleKey(makeKeyEvent('enter'));
        const start = picker.range.start!;
        expect(start.getMonth()).toBe(1); // February
        expect(start.getDate()).toBe(28); // clamped, not Mar 3
    });

    // 12. Start/end auto-swap when end < start
    it('auto-swaps start and end when end is selected before start', () => {
        const onChange = vi.fn();
        const picker = new DateRangePicker({ onChange });
        // Set cursor to June 10
        (picker as any)._cursorDate = new Date(2026, 5, 10);
        (picker as any)._currentMonth = new Date(2026, 5, 1);

        // First enter → start = June 10
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(10);

        // Move cursor back to June 5
        for (let i = 0; i < 5; i++) picker.handleKey(makeKeyEvent('left'));

        // Second enter → end is before start, should swap
        picker.handleKey(makeKeyEvent('enter'));

        expect(picker.range.start!.getDate()).toBe(5);  // swapped
        expect(picker.range.end!.getDate()).toBe(10);   // original start
    });

    // 13. Consecutive range resets
    it('consecutive enter presses cycle range correctly', () => {
        const picker = new DateRangePicker({
            value: { start: new Date(2026, 5, 10), end: new Date(2026, 5, 20) },
        });

        // 1st enter: resets — start-set at cursor (June 10), no end
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(10);
        expect(picker.range.end).toBeUndefined();

        // Move to June 20
        for (let i = 0; i < 10; i++) picker.handleKey(makeKeyEvent('right'));

        // 2nd enter: sets end at June 20
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(10);
        expect(picker.range.end!.getDate()).toBe(20);

        // 3rd enter: resets again — start-set at cursor (June 20), no stale end
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(20);
        expect(picker.range.end).toBeUndefined();
    });

    // 14. Enter fires onChange with correct shape at each step
    it('onChange receives partial range on first enter, full range on second', () => {
        const onChange = vi.fn();
        const picker = new DateRangePicker({ onChange });
        (picker as any)._cursorDate = new Date(2026, 5, 1);
        (picker as any)._currentMonth = new Date(2026, 5, 1);

        picker.handleKey(makeKeyEvent('enter'));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toEqual({ start: expect.any(Date) });
        expect(onChange.mock.calls[0][0].end).toBeUndefined();

        picker.handleKey(makeKeyEvent('right')); // June 2
        picker.handleKey(makeKeyEvent('enter'));
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(onChange.mock.calls[1][0]).toEqual({
            start: expect.any(Date),
            end: expect.any(Date),
        });
    });

    // 15. Return key mirrors enter
    it('"return" key behaves identically to "enter"', () => {
        const onChange = vi.fn();
        const picker = new DateRangePicker({ onChange });
        (picker as any)._cursorDate = new Date(2026, 5, 5);
        (picker as any)._currentMonth = new Date(2026, 5, 1);

        picker.handleKey(makeKeyEvent('return'));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(picker.range.start!.getDate()).toBe(5);
        expect(picker.range.end).toBeUndefined();
    });

    // 16. Unsupported keys do nothing
    it('unsupported keys (escape, tab, f1) do not move cursor or fire onChange', () => {
        const onChange = vi.fn();
        const picker = new DateRangePicker({ onChange });
        (picker as any)._cursorDate = new Date(2026, 5, 15);
        (picker as any)._currentMonth = new Date(2026, 5, 1);

        const cursorBefore = new Date((picker as any)._cursorDate);

        for (const key of ['escape', 'tab', 'f1']) {
            picker.handleKey(makeKeyEvent(key));
        }

        expect((picker as any)._cursorDate.getTime()).toBe(cursorBefore.getTime());
        expect(picker.range.start).toBeUndefined();
        expect(onChange).not.toHaveBeenCalled();
    });

    // 17. Vim navigation keys
    it('vim keys h/j/k/l navigate as left/down/up/right', () => {
        // Use a fresh picker so state='none' and each enter resets to start-set
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 5, 15);
        (picker as any)._currentMonth = new Date(2026, 5, 1);

        // l → right (+1 day); cursor goes from June 15 → June 16
        picker.handleKey(makeKeyEvent('l'));
        // First enter (state=none → start-set): sets start = June 16
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(16);

        // h → left (-1 day); cursor June 16 → June 15
        picker.handleKey(makeKeyEvent('h'));
        // Second enter (state=start-set → end-set): sets end = June 15
        // But June 15 < June 16, so swap: start=15, end=16
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(15); // swapped
        expect(picker.range.end!.getDate()).toBe(16);   // swapped

        // j → down (+7 days); cursor June 15 → June 22
        picker.handleKey(makeKeyEvent('j'));
        // Third enter (state=end-set → start-set): restarts range at June 22
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(22);
        expect(picker.range.end).toBeUndefined();

        // k → up (-7 days); cursor June 22 → June 15
        picker.handleKey(makeKeyEvent('k'));
        // Fourth enter (state=start-set → end-set): sets end=June 15
        // June 15 < June 22 start → swap: start=15, end=22
        picker.handleKey(makeKeyEvent('enter'));
        expect(picker.range.start!.getDate()).toBe(15);
        expect(picker.range.end!.getDate()).toBe(22);
    });

    // 18. Ctrl/Alt vim keys ignored
    it('ctrl+h, ctrl+j, alt+k, alt+l do not move the cursor', () => {
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 5, 15);
        (picker as any)._currentMonth = new Date(2026, 5, 1);
        const cursorBefore = (picker as any)._cursorDate.getTime();

        picker.handleKey(makeKeyEvent('h', { ctrl: true }));
        picker.handleKey(makeKeyEvent('j', { ctrl: true }));
        picker.handleKey(makeKeyEvent('k', { alt: true }));
        picker.handleKey(makeKeyEvent('l', { alt: true }));

        expect((picker as any)._cursorDate.getTime()).toBe(cursorBefore);
    });

    // 19. moveSelection(0) is a no-op
    it('moveSelection(0) does not change cursor or current month', () => {
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 5, 15);
        (picker as any)._currentMonth = new Date(2026, 5, 1);
        const cursorBefore = (picker as any)._cursorDate.getTime();
        const monthBefore = (picker as any)._currentMonth.getTime();

        picker.moveSelection(0);

        expect((picker as any)._cursorDate.getTime()).toBe(cursorBefore);
        expect((picker as any)._currentMonth.getTime()).toBe(monthBefore);
    });

    // 20. Rendering does not throw
    it('render does not throw for a typical screen', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const picker = new DateRangePicker({ value: { start: new Date(2026, 5, 15) } });
        const screen = makeScreen();
        expect(() => {
            picker.updateRect({ x: 0, y: 0, width: 30, height: 10 });
            picker.render(screen);
        }).not.toThrow();
    });

    // 21. Small width rendering is safe
    it('does not crash with very small widths (1, 5)', () => {
        const picker = new DateRangePicker({ value: { start: new Date(2026, 5, 1) } });
        for (const w of [1, 5]) {
            const screen = new Screen(w, 10);
            expect(() => {
                picker.updateRect({ x: 0, y: 0, width: w, height: 10 });
                picker.render(screen);
            }).not.toThrow();
        }
    });

    // 22. Small height rendering is safe
    it('does not crash with very small heights (1, 2)', () => {
        const picker = new DateRangePicker({ value: { start: new Date(2026, 5, 1) } });
        for (const h of [1, 2]) {
            const screen = new Screen(30, h);
            expect(() => {
                picker.updateRect({ x: 0, y: 0, width: 30, height: h });
                picker.render(screen);
            }).not.toThrow();
        }
    });

    // 23. Selected start date gets cyan fg styling
    it('start date cell is rendered with cyan foreground', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        // Use start=June 5, end=June 20 so cursor (which initializes to start=5)
        // does NOT coincide with the day we want to inspect (June 10).
        // We then check June 10 — it's the start date but NOT the cursor,
        // so it gets the cyan endpoint style.
        // Actually: cursor = start date = June 5. We check June 5 is rendered cyan.
        // But cursor is on June 5 too → renders as cursor (inverse/underline), not cyan.
        // So use start=June 5, end=June 20 and check June 20 (end, cursor not there):
        // OR: give both start and end and check start (cursor initializes from start,
        // which overrides cyan). Best approach: cursor = start = June 5, check end = June 20.
        // For test #23 we check start styling by having cursor elsewhere.
        // Set cursor manually to June 15 (not start), start=June 5, end=June 20.
        const picker = new DateRangePicker({
            value: { start: new Date(2026, 5, 5), end: new Date(2026, 5, 20) },
        });
        // Move cursor away from start date
        for (let i = 0; i < 10; i++) picker.handleKey(makeKeyEvent('right'));
        const screen = makeScreen();
        setupPicker(picker, screen);

        // June 2026: firstDay = 1 (Monday).
        // June 5 (start): idx = 5-1+1 = 5 → row=0, col=5
        const pos = dayPos(5, 1);
        const cellCol = colX(pos.col);
        const cellRow = GRID_START_Y + pos.row;

        // Verify the start date cell (June 5) has cyan fg
        const cell = screen.back[cellRow][cellCol];
        expect(cell.fg).toEqual({ type: 'named', name: 'cyan' });
    });

    // 24. Selected end date gets cyan styling
    it('end date cell is rendered with cyan foreground', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        // end = June 15, cursor initializes to start = June 5, so end cell won't be cursor.
        const picker = new DateRangePicker({
            value: { start: new Date(2026, 5, 5), end: new Date(2026, 5, 15) },
        });
        const screen = makeScreen();
        setupPicker(picker, screen);

        // June 15 end: idx = 15-1+1 = 15 → row=2, col=1
        const pos = dayPos(15, 1);
        const cellCol = colX(pos.col);
        const cellRow = GRID_START_Y + pos.row;

        const cell = screen.back[cellRow][cellCol];
        expect(cell.fg).toEqual({ type: 'named', name: 'cyan' });
    });

    // 25. Range interior highlight (June 10-15 interior days 11,12,13,14)
    it('interior days 11–14 in range [10,15] have black fg and cyan bg', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        // cursor initializes to start=10; interior days 11-14 are not cursor → cyan bg
        const picker = new DateRangePicker({
            value: { start: new Date(2026, 5, 10), end: new Date(2026, 5, 15) },
        });
        const screen = makeScreen();
        setupPicker(picker, screen);

        // June 2026, firstDOW = 1 (Monday)
        for (const day of [11, 12, 13, 14]) {
            const pos = dayPos(day, 1);
            const cx = colX(pos.col);
            const ry = GRID_START_Y + pos.row;

            const firstCharCell = screen.back[ry][cx];
            expect(firstCharCell.fg).toEqual({ type: 'named', name: 'black' });
            expect(firstCharCell.bg).toEqual({ type: 'named', name: 'cyan' });
        }
    });

    // 26. Focused cursor renders with inverse
    it('cursor cell uses inverse when widget is focused', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        // Fresh picker so cursor doesn't coincide with any range endpoint
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 5, 10);
        (picker as any)._currentMonth = new Date(2026, 5, 1);
        picker.isFocused = true;

        const screen = makeScreen();
        setupPicker(picker, screen);

        // Cursor is at June 10
        const pos = dayPos(10, 1);
        const cx = colX(pos.col);
        const ry = GRID_START_Y + pos.row;

        const cell = screen.back[ry][cx];
        expect(cell.inverse).toBe(true);
    });

    // 27. Unfocused cursor renders with underline
    it('cursor cell uses underline when widget is not focused', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        // Fresh picker so cursor doesn't coincide with any range endpoint
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 5, 10);
        (picker as any)._currentMonth = new Date(2026, 5, 1);
        picker.isFocused = false;

        const screen = makeScreen();
        setupPicker(picker, screen);

        const pos = dayPos(10, 1);
        const cx = colX(pos.col);
        const ry = GRID_START_Y + pos.row;

        const cell = screen.back[ry][cx];
        expect(cell.underline).toBe(true);
    });

    // 28. Month header rendering
    it('month header contains the current month name and year', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const picker = new DateRangePicker({ value: { start: new Date(2026, 7, 1) } }); // August
        const screen = makeScreen();
        setupPicker(picker, screen);

        // Header row is at content y = 1
        const header = rowText(screen, 1);
        expect(header).toContain('August 2026');
    });

    // 29. Weekday header rendering
    it('weekday header renders Su Mo Tu We Th Fr Sa', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const picker = new DateRangePicker({ value: { start: new Date(2026, 5, 1) } });
        const screen = makeScreen();
        setupPicker(picker, screen);

        // Weekday row is content y + 1 = 2
        const weekdayRow = rowText(screen, 2);
        expect(weekdayRow).toContain('Su Mo Tu We Th Fr Sa');
    });

    // 30. Multiple month navigation sequence maintains validity
    it('pagedown ×3 then pageup ×2 leaves cursor on a valid date', () => {
        // Fresh picker: state='none', cursor at June 15 2026
        const picker = new DateRangePicker();
        (picker as any)._cursorDate = new Date(2026, 5, 15);
        (picker as any)._currentMonth = new Date(2026, 5, 1);

        // June(5) +3 months = September(8); -2 months = July(6)
        for (let i = 0; i < 3; i++) picker.handleKey(makeKeyEvent('pagedown'));
        for (let i = 0; i < 2; i++) picker.handleKey(makeKeyEvent('pageup'));

        // Enter sets start from cursor position
        picker.handleKey(makeKeyEvent('enter'));
        const start = picker.range.start!;
        expect(start).toBeInstanceOf(Date);
        expect(isNaN(start.getTime())).toBe(false);
        expect(start.getFullYear()).toBe(2026);
        expect(start.getMonth()).toBe(6); // July
        expect(start.getDate()).toBe(15);

        // Current month must stay synchronized with cursor
        const currentMonth = (picker as any)._currentMonth as Date;
        expect(currentMonth.getFullYear()).toBe(2026);
        expect(currentMonth.getMonth()).toBe(6); // July
        expect(currentMonth.getDate()).toBe(1);
    });
});
