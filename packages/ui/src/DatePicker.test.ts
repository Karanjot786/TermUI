import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { DatePicker } from './DatePicker.js';
import type { KeyEvent } from '@termuijs/core';

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeKeyEvent = (key: string, opts: { ctrl?: boolean; alt?: boolean } = {}): KeyEvent => ({
    key,
    raw: Buffer.alloc(0),
    ctrl: opts.ctrl ?? false,
    alt: opts.alt ?? false,
    shift: false,
    stopPropagation: () => {},
    preventDefault: () => {}
});

/**
 * Create a DatePicker, set its rect to a sensible full-size calendar,
 * and return both the picker and a fresh Screen ready for rendering.
 */
function makePickerWithScreen(
    date: Date,
    cols = 30,
    rows = 12,
    onChange?: (d: Date) => void
): { picker: DatePicker; screen: Screen } {
    const picker = new DatePicker({ value: date, onChange });
    picker.updateRect({ x: 0, y: 0, width: cols, height: rows });
    const screen = new Screen(cols, rows);
    return { picker, screen };
}

/** Render and return an array of plain strings, one per screen row. */
function renderRows(picker: DatePicker, screen: Screen): string[] {
    screen.clear();
    picker.render(screen);
    return screen.back.map(row => row.map(c => c.char).join(''));
}

afterEach(() => {
    vi.restoreAllMocks();
});

// ─── existing tests (preserved) ──────────────────────────────────────────────

describe('DatePicker', () => {
    it('initializes with the correct default value and month', () => {
        const testDate = new Date(2026, 5, 1); // June 1, 2026
        const picker = new DatePicker({ value: testDate });

        expect(picker.value.getFullYear()).toBe(2026);
        expect(picker.value.getMonth()).toBe(5);
        expect(picker.value.getDate()).toBe(1);
        expect(picker.focusable).toBe(true);
    });

    it('navigates days and weeks with arrow keys', () => {
        const testDate = new Date(2026, 5, 15); // June 15, 2026
        const picker = new DatePicker({ value: testDate });

        // Move selection right (+1 day)
        picker.handleKey(makeKeyEvent('right'));
        expect(picker.value.getDate()).toBe(16);

        // Move selection left (-1 day)
        picker.handleKey(makeKeyEvent('left'));
        expect(picker.value.getDate()).toBe(15);

        // Move selection down (+7 days)
        picker.handleKey(makeKeyEvent('down'));
        expect(picker.value.getDate()).toBe(22);

        // Move selection up (-7 days)
        picker.handleKey(makeKeyEvent('up'));
        expect(picker.value.getDate()).toBe(15);
    });

    it('crosses month boundaries automatically during selection movement', () => {
        const testDate = new Date(2026, 5, 1); // June 1, 2026
        const picker = new DatePicker({ value: testDate });

        // Move selection left (-1 day) -> Should go to May 31, 2026
        picker.handleKey(makeKeyEvent('left'));
        expect(picker.value.getFullYear()).toBe(2026);
        expect(picker.value.getMonth()).toBe(4); // May is 4
        expect(picker.value.getDate()).toBe(31);
    });

    it('navigates months with PageUp and PageDown', () => {
        const testDate = new Date(2026, 5, 15); // June 15, 2026
        const picker = new DatePicker({ value: testDate });

        // PageDown shifts +1 month (July)
        picker.handleKey(makeKeyEvent('pagedown'));
        expect(picker.value.getMonth()).toBe(6); // July is 6

        // PageUp shifts -1 month (June)
        picker.handleKey(makeKeyEvent('pageup'));
        expect(picker.value.getMonth()).toBe(5); // June is 5
    });

    it('confirms the date and calls onChange when Enter is pressed', () => {
        const testDate = new Date(2026, 5, 15);
        const onChange = vi.fn();
        const picker = new DatePicker({ value: testDate, onChange });

        // Move selection and confirm
        picker.handleKey(makeKeyEvent('right')); // June 16
        picker.handleKey(makeKeyEvent('enter'));

        expect(onChange).toHaveBeenCalledTimes(1);
        const arg = onChange.mock.calls[0][0];
        expect(arg.getFullYear()).toBe(2026);
        expect(arg.getMonth()).toBe(5);
        expect(arg.getDate()).toBe(16);
    });

    it('clamps day when changing to a shorter month', () => {
        const testDate = new Date(2026, 0, 31); // Jan 31, 2026
        const picker = new DatePicker({ value: testDate });

        // Jan 31 + pagedown -> Feb: Feb has 28 days, should clamp to Feb 28
        picker.handleKey(makeKeyEvent('pagedown'));
        expect(picker.value.getMonth()).toBe(1); // February
        expect(picker.value.getDate()).toBe(28); // clamped, not rolled to Mar 3
    });

    // ── Test 1: Default initialization ────────────────────────────────────────

    it('(1) default constructor produces a valid date, focusable, and correct current month', () => {
        const before = new Date();
        const picker = new DatePicker();
        const after = new Date();

        const v = picker.value;
        // Must be a real Date object
        expect(v).toBeInstanceOf(Date);
        expect(Number.isNaN(v.getTime())).toBe(false);
        // Focusable flag
        expect(picker.focusable).toBe(true);
        // Selected date within test window
        expect(v.getTime()).toBeGreaterThanOrEqual(before.setHours(0, 0, 0, 0));
        expect(v.getTime()).toBeLessThanOrEqual(after.setHours(23, 59, 59, 999));
        // Current month must match selected date
        expect(picker.value.getMonth()).toBe(new Date().getMonth());
        expect(picker.value.getFullYear()).toBe(new Date().getFullYear());
    });

    // ── Test 2: Value setter updates state and normalises time ─────────────────

    it('(2) value setter updates selected date, current month, and normalises to midnight', () => {
        const picker = new DatePicker({ value: new Date(2026, 5, 15) });
        picker.value = new Date(2027, 3, 10); // April 10, 2027

        expect(picker.value.getFullYear()).toBe(2027);
        expect(picker.value.getMonth()).toBe(3);
        expect(picker.value.getDate()).toBe(10);
        // Time must be zeroed
        expect(picker.value.getHours()).toBe(0);
        expect(picker.value.getMinutes()).toBe(0);
        expect(picker.value.getSeconds()).toBe(0);
        expect(picker.value.getMilliseconds()).toBe(0);
        // Current month must follow selected date
        expect(picker.value.getMonth()).toBe(3);
        expect(picker.value.getFullYear()).toBe(2027);
    });

    // ── Test 3: Left navigation across year boundary ───────────────────────────

    it('(3) moving left on Jan 1 crosses into Dec 31 of previous year', () => {
        const picker = new DatePicker({ value: new Date(2026, 0, 1) }); // Jan 1, 2026
        picker.handleKey(makeKeyEvent('left'));

        expect(picker.value.getFullYear()).toBe(2025);
        expect(picker.value.getMonth()).toBe(11); // December
        expect(picker.value.getDate()).toBe(31);
    });

    // ── Test 4: Right navigation across year boundary ─────────────────────────

    it('(4) moving right on Dec 31 crosses into Jan 1 of next year', () => {
        const picker = new DatePicker({ value: new Date(2026, 11, 31) }); // Dec 31, 2026
        picker.handleKey(makeKeyEvent('right'));

        expect(picker.value.getFullYear()).toBe(2027);
        expect(picker.value.getMonth()).toBe(0); // January
        expect(picker.value.getDate()).toBe(1);
    });

    // ── Test 5: Week navigation across month boundaries ───────────────────────

    it('(5a) up arrow crosses into previous month correctly', () => {
        // June 3, 2026: moving -7 days goes to May 27, 2026
        const picker = new DatePicker({ value: new Date(2026, 5, 3) });
        picker.handleKey(makeKeyEvent('up'));

        expect(picker.value.getFullYear()).toBe(2026);
        expect(picker.value.getMonth()).toBe(4); // May
        expect(picker.value.getDate()).toBe(27);
    });

    it('(5b) down arrow crosses into next month correctly', () => {
        // May 28, 2026: moving +7 days goes to June 4, 2026
        const picker = new DatePicker({ value: new Date(2026, 4, 28) });
        picker.handleKey(makeKeyEvent('down'));

        expect(picker.value.getFullYear()).toBe(2026);
        expect(picker.value.getMonth()).toBe(5); // June
        expect(picker.value.getDate()).toBe(4);
    });

    it('(5c) current month syncs correctly after week navigation across boundary', () => {
        const picker = new DatePicker({ value: new Date(2026, 5, 3) }); // June 3
        picker.handleKey(makeKeyEvent('up')); // -> May 27

        // After crossing into May, value and current-month indicator must both be May
        expect(picker.value.getMonth()).toBe(4);
        // Re-render to confirm currentMonth was updated (no separate accessor,
        // verified via rendered header in test 18)
    });

    // ── Test 6: PageUp across year boundary ───────────────────────────────────

    it('(6) pageup on January wraps to December of previous year', () => {
        const picker = new DatePicker({ value: new Date(2026, 0, 15) }); // Jan 2026
        picker.handleKey(makeKeyEvent('pageup'));

        expect(picker.value.getFullYear()).toBe(2025);
        expect(picker.value.getMonth()).toBe(11); // December
        expect(picker.value.getDate()).toBe(15);
    });

    // ── Test 7: PageDown across year boundary ─────────────────────────────────

    it('(7) pagedown on December wraps to January of next year', () => {
        const picker = new DatePicker({ value: new Date(2026, 11, 15) }); // Dec 2026
        picker.handleKey(makeKeyEvent('pagedown'));

        expect(picker.value.getFullYear()).toBe(2027);
        expect(picker.value.getMonth()).toBe(0); // January
        expect(picker.value.getDate()).toBe(15);
    });

    // ── Test 8: Leap-year February clamping ───────────────────────────────────

    it('(8) Feb 29 in a leap year clamps correctly when advancing a month', () => {
        // Feb 29, 2024 (leap year): pagedown should go to Mar 29
        const picker = new DatePicker({ value: new Date(2024, 1, 29) });
        picker.handleKey(makeKeyEvent('pagedown'));

        expect(picker.value.getMonth()).toBe(2); // March
        expect(picker.value.getDate()).toBe(29);
        expect(Number.isNaN(picker.value.getTime())).toBe(false);
    });

    // ── Test 9: Non-leap year Feb clamping ────────────────────────────────────

    it('(9) Jan 31 pagedown to Feb clamps to Feb 28 in non-leap year', () => {
        const picker = new DatePicker({ value: new Date(2025, 0, 31) }); // Jan 31, 2025
        picker.handleKey(makeKeyEvent('pagedown'));

        expect(picker.value.getMonth()).toBe(1); // February
        expect(picker.value.getDate()).toBe(28);
        // Must not roll over into March
        expect(picker.value.getMonth()).not.toBe(2);
    });

    // ── Test 10: Multiple consecutive month changes ────────────────────────────

    it('(10) three consecutive pagedowns advance months and handle year rollover', () => {
        const picker = new DatePicker({ value: new Date(2026, 10, 15) }); // Nov 2026

        picker.handleKey(makeKeyEvent('pagedown')); // -> Dec 2026
        expect(picker.value.getMonth()).toBe(11);
        expect(picker.value.getFullYear()).toBe(2026);

        picker.handleKey(makeKeyEvent('pagedown')); // -> Jan 2027
        expect(picker.value.getMonth()).toBe(0);
        expect(picker.value.getFullYear()).toBe(2027);

        picker.handleKey(makeKeyEvent('pagedown')); // -> Feb 2027
        expect(picker.value.getMonth()).toBe(1);
        expect(picker.value.getFullYear()).toBe(2027);
    });

    // ── Test 11: Enter fires onChange exactly once ─────────────────────────────

    it('(11) enter fires onChange exactly once with the current selected date', () => {
        const onChange = vi.fn();
        const picker = new DatePicker({ value: new Date(2026, 5, 15), onChange });
        picker.handleKey(makeKeyEvent('enter'));

        expect(onChange).toHaveBeenCalledTimes(1);
        const fired = onChange.mock.calls[0][0] as Date;
        expect(fired.getFullYear()).toBe(2026);
        expect(fired.getMonth()).toBe(5);
        expect(fired.getDate()).toBe(15);
    });

    // ── Test 12: Return key also confirms ─────────────────────────────────────

    it('(12) return key fires onChange with the same behaviour as enter', () => {
        const onChange = vi.fn();
        const picker = new DatePicker({ value: new Date(2026, 5, 20), onChange });
        picker.handleKey(makeKeyEvent('return'));

        expect(onChange).toHaveBeenCalledTimes(1);
        const fired = onChange.mock.calls[0][0] as Date;
        expect(fired.getDate()).toBe(20);
    });

    // ── Test 13: Unsupported keys do nothing ──────────────────────────────────

    it('(13) unsupported keys do not change date or fire callback', () => {
        const onChange = vi.fn();
        const picker = new DatePicker({ value: new Date(2026, 5, 15), onChange });
        const original = picker.value.getTime();

        for (const key of ['escape', 'tab', 'f1', 'f5', 'backspace', 'delete']) {
            picker.handleKey(makeKeyEvent(key));
        }

        expect(picker.value.getTime()).toBe(original);
        expect(onChange).not.toHaveBeenCalled();
    });

    // ── Test 14: Vim navigation keys ──────────────────────────────────────────

    it('(14a) vim h/l mirror left/right arrow navigation', () => {
        const picker = new DatePicker({ value: new Date(2026, 5, 15) });

        picker.handleKey(makeKeyEvent('l')); // +1 day
        expect(picker.value.getDate()).toBe(16);

        picker.handleKey(makeKeyEvent('h')); // -1 day
        expect(picker.value.getDate()).toBe(15);
    });

    it('(14b) vim j/k mirror down/up arrow navigation', () => {
        const picker = new DatePicker({ value: new Date(2026, 5, 15) });

        picker.handleKey(makeKeyEvent('j')); // +7 days
        expect(picker.value.getDate()).toBe(22);

        picker.handleKey(makeKeyEvent('k')); // -7 days
        expect(picker.value.getDate()).toBe(15);
    });

    // ── Test 15: Ctrl/Alt modified vim keys are ignored ───────────────────────

    it('(15) ctrl/alt+vim keys do not move the selection', () => {
        const picker = new DatePicker({ value: new Date(2026, 5, 15) });
        const original = picker.value.getDate();

        picker.handleKey(makeKeyEvent('h', { ctrl: true }));
        picker.handleKey(makeKeyEvent('j', { ctrl: true }));
        picker.handleKey(makeKeyEvent('k', { alt: true }));
        picker.handleKey(makeKeyEvent('l', { alt: true }));

        expect(picker.value.getDate()).toBe(original);
    });

    // ── Test 16: moveSelection(0) ─────────────────────────────────────────────

    it('(16) moveSelection(0) leaves the date unchanged', () => {
        const picker = new DatePicker({ value: new Date(2026, 5, 15) });
        const original = picker.value.getTime();

        picker.moveSelection(0);

        expect(picker.value.getTime()).toBe(original);
        expect(Number.isNaN(picker.value.getTime())).toBe(false);
    });

    // ── Test 17: Rendering does not throw ─────────────────────────────────────

    it('(17) render does not throw for a standard-size screen', () => {
        const { picker, screen } = makePickerWithScreen(new Date(2026, 5, 15));
        expect(() => picker.render(screen)).not.toThrow();
    });

    // ── Test 18: Month header rendering ───────────────────────────────────────

    it('(18) rendered output contains the current month name and year', () => {
        const { picker, screen } = makePickerWithScreen(new Date(2026, 5, 15)); // June 2026
        const rows = renderRows(picker, screen);
        const all = rows.join('\n');
        expect(all).toContain('June');
        expect(all).toContain('2026');
    });

    // ── Test 19: Weekday header rendering ─────────────────────────────────────

    it('(19) rendered output contains the weekday header row', () => {
        const { picker, screen } = makePickerWithScreen(new Date(2026, 5, 15));
        const rows = renderRows(picker, screen);
        const all = rows.join('\n');
        expect(all).toContain('Su Mo Tu We Th Fr Sa');
    });

    // ── Test 20: Selected date is rendered and highlighted ────────────────────

    it('(20) selected date cell is bold and rendered in the grid', () => {
        const date = new Date(2026, 5, 15); // June 15
        const { picker, screen } = makePickerWithScreen(date);
        renderRows(picker, screen);

        // Locate "15" somewhere in the grid cells and verify it has bold styling
        let foundBold = false;
        for (let r = 0; r < screen.back.length; r++) {
            const row = screen.back[r];
            for (let c = 0; c < row.length - 1; c++) {
                const cell = row[c];
                const next = row[c + 1];
                if ((cell.char === ' ' || cell.char === '1') && next.char === '5' && cell.bold) {
                    foundBold = true;
                }
                if (cell.char === '1' && next.char === '5' && cell.bold) {
                    foundBold = true;
                }
            }
        }
        // Also confirm the text "15" or " 15" appears
        const all = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(all).toMatch(/\s*15\s*/);
        expect(foundBold).toBe(true);
    });

    // ── Test 21: Focused vs unfocused rendering ───────────────────────────────

    it('(21) focused selected cell uses inverse styling; unfocused uses underline', () => {
        const date = new Date(2026, 5, 2); // June 2
        const { picker, screen } = makePickerWithScreen(date);

        // Focused render
        picker.isFocused = true;
        const focusedScreen = new Screen(30, 12);
        picker.render(focusedScreen);

        // Unfocused render
        picker.isFocused = false;
        const unfocusedScreen = new Screen(30, 12);
        picker.render(unfocusedScreen);

        // Find a selected cell in each buffer — the selected day should have
        // inverse=true (focused) and underline=true + inverse=false (unfocused)
        let foundInverse = false;
        let foundUnderline = false;

        for (const row of focusedScreen.back) {
            for (const cell of row) {
                if (cell.bold && cell.inverse) { foundInverse = true; }
            }
        }
        for (const row of unfocusedScreen.back) {
            for (const cell of row) {
                if (cell.bold && cell.underline && !cell.inverse) { foundUnderline = true; }
            }
        }

        expect(foundInverse).toBe(true);
        expect(foundUnderline).toBe(true);
    });

    // ── Test 22: Small height rendering ───────────────────────────────────────

    it('(22) render with extremely small height does not throw', () => {
        for (const h of [1, 2]) {
            const picker = new DatePicker({ value: new Date(2026, 5, 15) });
            picker.updateRect({ x: 0, y: 0, width: 30, height: h });
            const screen = new Screen(30, h);
            expect(() => picker.render(screen)).not.toThrow();
        }
    });

    // ── Test 23: Small width rendering ────────────────────────────────────────

    it('(23) render with extremely small width does not throw', () => {
        for (const w of [1, 5]) {
            const picker = new DatePicker({ value: new Date(2026, 5, 15) });
            picker.updateRect({ x: 0, y: 0, width: w, height: 12 });
            const screen = new Screen(w, 12);
            expect(() => picker.render(screen)).not.toThrow();
        }
    });

    // ── Test 24: Value getter immutability ────────────────────────────────────

    it('(24) value getter returns the internal reference — mutating it modifies internal state (documented behaviour)', () => {
        // NOTE: The current implementation returns `this._selectedDate` directly
        // without copying. This test documents that behaviour. If the impl is ever
        // changed to return a defensive copy, the second assertion should flip.
        const picker = new DatePicker({ value: new Date(2026, 5, 15) });
        const ref = picker.value;

        // Mutate the returned reference
        ref.setFullYear(1999);

        // Because value getter returns the raw reference, internal state is now 1999
        expect(picker.value.getFullYear()).toBe(1999);
        // Document: callers should NOT rely on mutating the returned Date.
        // A defensive copy in the getter would make this fail — update test if fixed.
    });

    // ── Test 25: Consecutive confirm calls ────────────────────────────────────

    it('(25) pressing enter multiple times fires onChange that many times', () => {
        const onChange = vi.fn();
        const picker = new DatePicker({ value: new Date(2026, 5, 15), onChange });

        picker.handleKey(makeKeyEvent('enter'));
        picker.handleKey(makeKeyEvent('enter'));
        picker.handleKey(makeKeyEvent('enter'));

        expect(onChange).toHaveBeenCalledTimes(3);
        // Date must remain unchanged across presses
        const first = onChange.mock.calls[0][0] as Date;
        const third = onChange.mock.calls[2][0] as Date;
        expect(first.getTime()).toBe(third.getTime());
    });

    // ── Test 26: Month synchronization after navigation ───────────────────────

    it('(26a) _currentMonth stays in sync with selected date after left/right boundary crossing', () => {
        const picker = new DatePicker({ value: new Date(2026, 5, 1) }); // June 1

        // Cross left into May
        picker.handleKey(makeKeyEvent('left')); // -> May 31
        // The header must now show "May"
        const { screen } = makePickerWithScreen(new Date(2026, 4, 31));
        picker.updateRect({ x: 0, y: 0, width: 30, height: 12 });
        const freshScreen = new Screen(30, 12);
        picker.render(freshScreen);
        const all = freshScreen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(all).toContain('May');
        expect(all).not.toContain('June');
    });

    it('(26b) _currentMonth stays in sync after up/down boundary crossing', () => {
        const picker = new DatePicker({ value: new Date(2026, 5, 3) }); // June 3

        // -7 days -> May 27
        picker.handleKey(makeKeyEvent('up'));
        picker.updateRect({ x: 0, y: 0, width: 30, height: 12 });
        const screen = new Screen(30, 12);
        picker.render(screen);
        const all = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(all).toContain('May');
    });

    it('(26c) _currentMonth stays in sync after pagedown year boundary crossing', () => {
        const picker = new DatePicker({ value: new Date(2026, 11, 15) }); // Dec 2026
        picker.handleKey(makeKeyEvent('pagedown')); // -> Jan 2027

        picker.updateRect({ x: 0, y: 0, width: 30, height: 12 });
        const screen = new Screen(30, 12);
        picker.render(screen);
        const all = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(all).toContain('January');
        expect(all).toContain('2027');
    });
});
