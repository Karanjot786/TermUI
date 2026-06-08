// ─────────────────────────────────────────────────────
// @termuijs/ui — EmailInput tests
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { EmailInput } from './EmailInput.js';
import type { KeyEvent } from '@termuijs/core';

// ── Helpers ──────────────────────────────────────────

/** Build a minimal KeyEvent, merging any overrides. */
function key(k: string, overrides: Partial<KeyEvent> = {}): KeyEvent {
    return {
        key: k,
        ctrl: false,
        shift: false,
        alt: false,
        raw: Buffer.from(k),
        stopPropagation: () => {},
        preventDefault: () => {},
        ...overrides,
    };
}

/** Type every character of a string into the widget. */
function typeString(input: EmailInput, str: string): void {
    for (const ch of str) {
        input.handleKey(key(ch));
    }
}

/**
 * Render the widget into a fresh Screen and return the text of the
 * content row (row 1 — row 0 and row 2 are border lines).
 */
function renderRow(input: EmailInput, width = 40): string {
    const screen = new Screen(width, 3);
    input.updateRect({ x: 0, y: 0, width, height: 3 });
    input.render(screen);
    return screen.back[1].map(c => c.char).join('');
}

// ─────────────────────────────────────────────────────
// Original tests (preserved)
// ─────────────────────────────────────────────────────

describe('EmailInput', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initial render shows placeholder', () => {
        const input = new EmailInput({}, { placeholder: 'Enter email...' });
        const screen = new Screen(20, 3);

        input.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        input.render(screen);

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('Enter email...');
    });

    it('typing a valid email makes isValid() return true', () => {
        const input = new EmailInput();

        const chars = 'a@b.com'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.getValue()).toBe('a@b.com');
        expect(input.isValid()).toBe(true);
    });

    it('typing an invalid email makes isValid() return false', () => {
        const input = new EmailInput();

        const chars = 'notvalid'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.getValue()).toBe('notvalid');
        expect(input.isValid()).toBe(false);
    });

    it('enter fires onSubmit when valid', () => {
        let submittedValue = '';
        const input = new EmailInput({}, {
            onSubmit: (val) => { submittedValue = val; }
        });

        const chars = 'test@example.com'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.isValid()).toBe(true);

        // Press enter
        input.handleKey({ key: 'enter', ctrl: false, shift: false, alt: false, raw: Buffer.from('enter'), stopPropagation: () => {}, preventDefault: () => {} });

        expect(submittedValue).toBe('test@example.com');
    });

    it('enter does not fire onSubmit when invalid', () => {
        let submittedValue = '';
        const input = new EmailInput({}, {
            onSubmit: (val) => { submittedValue = val; }
        });

        const chars = 'test@'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.isValid()).toBe(false);

        // Press enter
        input.handleKey({ key: 'enter', ctrl: false, shift: false, alt: false, raw: Buffer.from('enter'), stopPropagation: () => {}, preventDefault: () => {} });

        expect(submittedValue).toBe('');
    });

    it('tab completes domain suggestion', () => {
        const input = new EmailInput({}, {
            domains: ['gmail.com', 'outlook.com', 'yahoo.com']
        });

        const chars = 'user@g'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.getValue()).toBe('user@g');

        // Press tab
        input.handleKey({ key: 'tab', ctrl: false, shift: false, alt: false, raw: Buffer.from('tab'), stopPropagation: () => {}, preventDefault: () => {} });

        expect(input.getValue()).toBe('user@gmail.com');
    });

    // ─────────────────────────────────────────────────────
    // 1. Change Notifications
    // ─────────────────────────────────────────────────────

    describe('change notifications', () => {
        it('calls onChange with correct value and validity on insertion', () => {
            const onChange = vi.fn();
            const input = new EmailInput({}, { onChange });

            typeString(input, 'a@b.com');

            // onChange must have been called for every character
            expect(onChange).toHaveBeenCalledTimes(7);

            // Final call should report the complete address as valid
            const [lastValue, lastValid] = onChange.mock.calls[6];
            expect(lastValue).toBe('a@b.com');
            expect(lastValid).toBe(true);
        });

        it('calls onChange with correct value and validity on backspace deletion', () => {
            const onChange = vi.fn();
            const input = new EmailInput({}, { onChange });

            typeString(input, 'a@b.com');
            onChange.mockClear();

            input.handleKey(key('backspace'));

            expect(onChange).toHaveBeenCalledTimes(1);
            const [value, valid] = onChange.mock.calls[0];
            // Removing the final 'm' leaves 'a@b.co' which still satisfies
            // /^[^@]+@[^@]+\.[^@]+$/ — local@domain.tld with tld='o'
            expect(value).toBe('a@b.co');
            expect(valid).toBe(true);
        });

        it('calls onChange when autocomplete changes the value', () => {
            const onChange = vi.fn();
            const input = new EmailInput({}, { onChange, domains: ['gmail.com'] });

            typeString(input, 'user@g');
            onChange.mockClear();

            input.handleKey(key('tab'));

            expect(onChange).toHaveBeenCalledTimes(1);
            const [value, valid] = onChange.mock.calls[0];
            expect(value).toBe('user@gmail.com');
            expect(valid).toBe(true);
        });

        it('calls onChange on deleteForward (delete key)', () => {
            const onChange = vi.fn();
            const input = new EmailInput({}, { onChange });

            typeString(input, 'abc');
            // Move cursor to start
            input.handleKey(key('home'));
            onChange.mockClear();

            input.handleKey(key('delete'));

            expect(onChange).toHaveBeenCalledTimes(1);
            const [value] = onChange.mock.calls[0];
            expect(value).toBe('bc');
        });

        it('passes isValid() result accurately in the validity argument', () => {
            const onChange = vi.fn();
            const input = new EmailInput({}, { onChange });

            // Type 'a@b.com' character by character and track each call.
            // The regex /^[^@]+@[^@]+\.[^@]+$/ requires local@x.y — so
            // validity becomes true as soon as there is at least one char
            // after the dot (i.e. from 'a@b.c' onward).
            typeString(input, 'a@b.com');

            const calls = onChange.mock.calls as Array<[string, boolean]>;
            expect(calls[0]).toEqual(['a', false]);      // no @
            expect(calls[1]).toEqual(['a@', false]);     // no domain
            expect(calls[2]).toEqual(['a@b', false]);    // no dot
            expect(calls[3]).toEqual(['a@b.', false]);   // nothing after dot
            expect(calls[4]).toEqual(['a@b.c', true]);   // 'c' satisfies [^@]+
            expect(calls[5]).toEqual(['a@b.co', true]);
            expect(calls[6]).toEqual(['a@b.com', true]);
        });
    });

    // ─────────────────────────────────────────────────────
    // 2. Cursor Navigation
    // ─────────────────────────────────────────────────────

    describe('cursor navigation', () => {
        it('left moves cursor left and stops at 0', () => {
            const input = new EmailInput();
            typeString(input, 'abc'); // cursor at 3

            input.handleKey(key('left')); // cursor → 2
            input.handleKey(key('left')); // cursor → 1

            // Cursor is at index 1 (between 'a' and 'b').
            // Inserting 'X' here yields 'aXbc'.
            typeString(input, 'X');
            expect(input.getValue()).toBe('aXbc');
        });

        it('left at position 0 does not move below 0', () => {
            const input = new EmailInput();
            typeString(input, 'ab');
            input.handleKey(key('home'));

            // Multiple lefts from 0 — must be safe
            input.handleKey(key('left'));
            input.handleKey(key('left'));

            // Inserting here should still go to the front
            typeString(input, 'Z');
            expect(input.getValue()).toBe('Zab');
        });

        it('right moves cursor right and stops at length', () => {
            const input = new EmailInput();
            typeString(input, 'abc');
            input.handleKey(key('home'));

            input.handleKey(key('right'));
            input.handleKey(key('right'));

            // Cursor is now at index 2; inserting 'X' yields 'abXc'
            typeString(input, 'X');
            expect(input.getValue()).toBe('abXc');
        });

        it('right at end does not move beyond length', () => {
            const input = new EmailInput();
            typeString(input, 'ab');

            // Multiple rights from end — must be safe
            input.handleKey(key('right'));
            input.handleKey(key('right'));

            // Inserting here should still append at the end
            typeString(input, 'Z');
            expect(input.getValue()).toBe('abZ');
        });

        it('home moves cursor to the beginning', () => {
            const input = new EmailInput();
            typeString(input, 'abc');

            input.handleKey(key('home'));
            typeString(input, 'X');

            expect(input.getValue()).toBe('Xabc');
        });

        it('end moves cursor to the end', () => {
            const input = new EmailInput();
            typeString(input, 'abc');
            input.handleKey(key('home'));   // cursor at 0
            input.handleKey(key('end'));    // cursor at 3

            typeString(input, 'Z');
            expect(input.getValue()).toBe('abcZ');
        });

        it('insertion occurs at the current cursor position', () => {
            const input = new EmailInput();
            typeString(input, 'aXb');
            // Move cursor between 'a' and 'X' (index 1)
            input.handleKey(key('home'));
            input.handleKey(key('right')); // cursor at 1

            // Delete 'X' with deleteForward
            input.handleKey(key('delete'));
            expect(input.getValue()).toBe('ab');
        });
    });

    // ─────────────────────────────────────────────────────
    // 3. Character Deletion
    // ─────────────────────────────────────────────────────

    describe('character deletion', () => {
        it('backspace removes the character before the cursor', () => {
            const input = new EmailInput();
            typeString(input, 'abc');

            input.handleKey(key('backspace'));
            expect(input.getValue()).toBe('ab');
        });

        it('delete removes the character after the cursor', () => {
            const input = new EmailInput();
            typeString(input, 'abc');
            input.handleKey(key('home'));

            input.handleKey(key('delete'));
            expect(input.getValue()).toBe('bc');
        });

        it('backspace at position 0 is safe (no-op)', () => {
            const input = new EmailInput();
            typeString(input, 'a');
            input.handleKey(key('home'));

            expect(() => input.handleKey(key('backspace'))).not.toThrow();
            expect(input.getValue()).toBe('a');
        });

        it('delete at end is safe (no-op)', () => {
            const input = new EmailInput();
            typeString(input, 'a');

            expect(() => input.handleKey(key('delete'))).not.toThrow();
            expect(input.getValue()).toBe('a');
        });

        it('backspace on empty input is safe (no-op)', () => {
            const input = new EmailInput();
            expect(() => input.handleKey(key('backspace'))).not.toThrow();
            expect(input.getValue()).toBe('');
        });

        it('delete on empty input is safe (no-op)', () => {
            const input = new EmailInput();
            expect(() => input.handleKey(key('delete'))).not.toThrow();
            expect(input.getValue()).toBe('');
        });

        it('backspace in the middle removes only the preceding character', () => {
            const input = new EmailInput();
            typeString(input, 'abcd');
            // cursor is at 4; move to index 2
            input.handleKey(key('left'));
            input.handleKey(key('left'));

            input.handleKey(key('backspace'));
            expect(input.getValue()).toBe('acd');
        });

        it('delete in the middle removes only the following character', () => {
            const input = new EmailInput();
            typeString(input, 'abcd');
            // cursor is at 4; move to index 1
            input.handleKey(key('home'));
            input.handleKey(key('right'));

            input.handleKey(key('delete'));
            expect(input.getValue()).toBe('acd');
        });
    });

    // ─────────────────────────────────────────────────────
    // 4. Validation Edge Cases
    // ─────────────────────────────────────────────────────

    describe('isValid() edge cases', () => {
        it('empty string is invalid', () => {
            const input = new EmailInput();
            expect(input.isValid()).toBe(false);
        });

        it('a@b.com is valid', () => {
            const input = new EmailInput();
            typeString(input, 'a@b.com');
            expect(input.isValid()).toBe(true);
        });

        it('test@example.org is valid', () => {
            const input = new EmailInput();
            typeString(input, 'test@example.org');
            expect(input.isValid()).toBe(true);
        });

        it('"abc" (no @) is invalid', () => {
            const input = new EmailInput();
            typeString(input, 'abc');
            expect(input.isValid()).toBe(false);
        });

        it('"@" alone is invalid', () => {
            const input = new EmailInput();
            typeString(input, '@');
            expect(input.isValid()).toBe(false);
        });

        it('"a@" (no domain) is invalid', () => {
            const input = new EmailInput();
            typeString(input, 'a@');
            expect(input.isValid()).toBe(false);
        });

        it('"@b.com" (no local-part) is invalid', () => {
            const input = new EmailInput();
            typeString(input, '@b.com');
            expect(input.isValid()).toBe(false);
        });

        it('"a@b" (no TLD dot) is invalid', () => {
            const input = new EmailInput();
            typeString(input, 'a@b');
            expect(input.isValid()).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────
    // 5. Submit Behavior
    // ─────────────────────────────────────────────────────

    describe('submit behavior', () => {
        it('"enter" calls onSubmit with the current value when valid', () => {
            const onSubmit = vi.fn();
            const input = new EmailInput({}, { onSubmit });

            typeString(input, 'hi@test.io');
            input.handleKey(key('enter'));

            expect(onSubmit).toHaveBeenCalledOnce();
            expect(onSubmit).toHaveBeenCalledWith('hi@test.io');
        });

        it('"return" also calls onSubmit when valid', () => {
            const onSubmit = vi.fn();
            const input = new EmailInput({}, { onSubmit });

            typeString(input, 'hi@test.io');
            input.handleKey(key('return'));

            expect(onSubmit).toHaveBeenCalledOnce();
            expect(onSubmit).toHaveBeenCalledWith('hi@test.io');
        });

        it('"enter" does not call onSubmit when invalid', () => {
            const onSubmit = vi.fn();
            const input = new EmailInput({}, { onSubmit });

            typeString(input, 'notanemail');
            input.handleKey(key('enter'));

            expect(onSubmit).not.toHaveBeenCalled();
        });

        it('"return" does not call onSubmit when invalid', () => {
            const onSubmit = vi.fn();
            const input = new EmailInput({}, { onSubmit });

            typeString(input, 'bad@');
            input.handleKey(key('return'));

            expect(onSubmit).not.toHaveBeenCalled();
        });

        it('submitted value exactly matches current input', () => {
            const received: string[] = [];
            const input = new EmailInput({}, { onSubmit: v => received.push(v) });

            typeString(input, 'user@domain.net');
            input.handleKey(key('enter'));

            expect(received).toEqual(['user@domain.net']);
            expect(received[0]).toBe(input.getValue());
        });
    });

    // ─────────────────────────────────────────────────────
    // 6. Domain Autocomplete
    // ─────────────────────────────────────────────────────

    describe('domain autocomplete (tab)', () => {
        it('completes a matching domain after @', () => {
            const input = new EmailInput({}, { domains: ['gmail.com', 'outlook.com'] });
            typeString(input, 'user@out');

            input.handleKey(key('tab'));

            expect(input.getValue()).toBe('user@outlook.com');
        });

        it('is a no-op when there is no @ in the input', () => {
            const input = new EmailInput({}, { domains: ['gmail.com'] });
            typeString(input, 'useronly');

            input.handleKey(key('tab'));

            expect(input.getValue()).toBe('useronly');
        });

        it('is a no-op when no domain prefix matches', () => {
            const input = new EmailInput({}, { domains: ['gmail.com', 'yahoo.com'] });
            typeString(input, 'user@zzz');

            input.handleKey(key('tab'));

            expect(input.getValue()).toBe('user@zzz');
        });

        it('cursor is at the end after autocomplete', () => {
            const onChange = vi.fn();
            const input = new EmailInput({}, { onChange, domains: ['gmail.com'] });
            typeString(input, 'a@g');
            onChange.mockClear();

            input.handleKey(key('tab'));

            // After autocomplete, typing should append at the end
            typeString(input, '!');
            expect(input.getValue()).toBe('a@gmail.com!');
        });

        it('uses the first domain that starts with the typed suffix', () => {
            // Both 'google.com' and 'gmail.com' start with 'g' — first match wins
            const input = new EmailInput({}, { domains: ['google.com', 'gmail.com'] });
            typeString(input, 'u@g');

            input.handleKey(key('tab'));

            expect(input.getValue()).toBe('u@google.com');
        });

        it('autocomplete replaces the entire domain portion, not just appending', () => {
            const input = new EmailInput({}, { domains: ['gmail.com'] });
            typeString(input, 'user@gmai');

            input.handleKey(key('tab'));

            expect(input.getValue()).toBe('user@gmail.com');
            // Ensure there is no double domain
            expect(input.getValue().split('@').length).toBe(2);
        });
    });

    // ─────────────────────────────────────────────────────
    // 7. Modifier Keys
    // ─────────────────────────────────────────────────────

    describe('modifier keys', () => {
        it('ignores printable chars when ctrl is true', () => {
            const input = new EmailInput();
            typeString(input, 'a@b.com');
            const before = input.getValue();

            input.handleKey(key('x', { ctrl: true }));

            expect(input.getValue()).toBe(before);
        });

        it('ignores printable chars when alt is true', () => {
            const input = new EmailInput();
            typeString(input, 'a@b.com');
            const before = input.getValue();

            input.handleKey(key('x', { alt: true }));

            expect(input.getValue()).toBe(before);
        });

        it('ctrl+any single char does not affect the value', () => {
            const onChange = vi.fn();
            const input = new EmailInput({}, { onChange });

            input.handleKey(key('a', { ctrl: true }));
            input.handleKey(key('c', { ctrl: true }));
            input.handleKey(key('v', { ctrl: true }));

            expect(onChange).not.toHaveBeenCalled();
            expect(input.getValue()).toBe('');
        });

        it('alt+char does not insert a character', () => {
            const onChange = vi.fn();
            const input = new EmailInput({}, { onChange });

            input.handleKey(key('f', { alt: true }));

            expect(onChange).not.toHaveBeenCalled();
            expect(input.getValue()).toBe('');
        });
    });

    // ─────────────────────────────────────────────────────
    // 8. Rendering Behavior
    // ─────────────────────────────────────────────────────

    describe('rendering', () => {
        // ── Placeholder ───────────────────────────────────

        it('placeholder renders when value is empty and widget is not focused', () => {
            const input = new EmailInput({}, { placeholder: 'your@email.com' });
            const row = renderRow(input);
            expect(row).toContain('your@email.com');
        });

        it('placeholder disappears once text is entered', () => {
            const input = new EmailInput({}, { placeholder: 'your@email.com' });
            typeString(input, 'a');
            const row = renderRow(input);
            expect(row).not.toContain('your@email.com');
            expect(row).toContain('a');
        });

        it('placeholder is not shown when widget is focused (even with empty value)', () => {
            const input = new EmailInput({}, { placeholder: 'hint' });
            input.isFocused = true;
            const row = renderRow(input);
            expect(row).not.toContain('hint');
        });

        // ── Error State ───────────────────────────────────

        it('invalid non-empty email renders the [!] indicator', () => {
            const input = new EmailInput();
            typeString(input, 'bad-email');
            // Use a wider screen so the error indicator has room (width > 4)
            const row = renderRow(input, 40);
            expect(row).toContain('[!]');
        });

        it('[!] indicator is not rendered for empty input', () => {
            const input = new EmailInput();
            const row = renderRow(input, 40);
            expect(row).not.toContain('[!]');
        });

        it('[!] uses the errorColor supplied in options', () => {
            const customColor = { type: 'named' as const, name: 'magenta' as const };
            const input = new EmailInput({}, { errorColor: customColor });
            typeString(input, 'notvalid');

            const screen = new Screen(40, 3);
            input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
            input.render(screen);

            // The [!] should be rendered in the customColor on row 1
            const row = screen.back[1];
            const exclamationCell = row.find(c => c.char === '[');
            expect(exclamationCell).toBeDefined();
            expect(exclamationCell!.fg).toEqual(customColor);
        });

        // ── Valid State ───────────────────────────────────

        it('valid email does not render [!]', () => {
            const input = new EmailInput();
            typeString(input, 'ok@test.com');
            const row = renderRow(input, 40);
            expect(row).not.toContain('[!]');
        });

        // ── Long Content / Horizontal Scrolling ──────────

        it('rendering a very long email does not throw', () => {
            const input = new EmailInput();
            const longEmail = 'a'.repeat(80) + '@example.com';
            typeString(input, longEmail);
            expect(() => renderRow(input, 30)).not.toThrow();
        });

        it('text after the visible window is scrolled correctly (long email)', () => {
            // With a 20-wide screen (18 content cols) typing > 18 chars should
            // cause scrolling; the rendered row must still contain some chars.
            const input = new EmailInput();
            typeString(input, 'verylongemail@domain.org');
            const row = renderRow(input, 20);
            // The row should have non-space, non-border content
            expect(row.trim().length).toBeGreaterThan(0);
        });

        // ── Focused Cursor ────────────────────────────────

        it('focused widget renders the cursor with inverse attribute', () => {
            const input = new EmailInput();
            typeString(input, 'abc');
            input.isFocused = true;

            const screen = new Screen(40, 3);
            input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
            input.render(screen);

            // Cursor is at position 3 (end of 'abc'); content starts at col 1
            // (border). So cursor screen col = 1 + 3 = 4.
            const cursorCell = screen.back[1][4];
            expect(cursorCell.inverse).toBe(true);
        });

        it('cursor char is the character at the cursor position when not at end', () => {
            const input = new EmailInput();
            typeString(input, 'ab');
            input.handleKey(key('home')); // cursor at 0
            input.isFocused = true;

            const screen = new Screen(40, 3);
            input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
            input.render(screen);

            // Cursor at col 0 within content → screen col 1
            const cursorCell = screen.back[1][1];
            expect(cursorCell.char).toBe('a');
            expect(cursorCell.inverse).toBe(true);
        });

        it('cursor char is a space when at the end of text', () => {
            const input = new EmailInput();
            typeString(input, 'x');
            input.isFocused = true;

            const screen = new Screen(40, 3);
            input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
            input.render(screen);

            // cursor at index 1 (end), screen col = 1 + 1 = 2
            const cursorCell = screen.back[1][2];
            expect(cursorCell.char).toBe(' ');
            expect(cursorCell.inverse).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────
    // 9. Dirty State
    // ─────────────────────────────────────────────────────

    describe('markDirty()', () => {
        it('is called when a character is inserted', () => {
            const input = new EmailInput();
            const spy = vi.spyOn(input, 'markDirty');

            input.handleKey(key('a'));

            expect(spy).toHaveBeenCalled();
        });

        it('is called when backspace removes a character', () => {
            const input = new EmailInput();
            typeString(input, 'abc');
            const spy = vi.spyOn(input, 'markDirty');

            input.handleKey(key('backspace'));

            expect(spy).toHaveBeenCalled();
        });

        it('is called when delete removes a character', () => {
            const input = new EmailInput();
            typeString(input, 'abc');
            input.handleKey(key('home'));
            const spy = vi.spyOn(input, 'markDirty');

            input.handleKey(key('delete'));

            expect(spy).toHaveBeenCalled();
        });

        it('is called when cursor moves left', () => {
            const input = new EmailInput();
            typeString(input, 'ab');
            const spy = vi.spyOn(input, 'markDirty');

            input.handleKey(key('left'));

            expect(spy).toHaveBeenCalled();
        });

        it('is called when cursor moves right', () => {
            const input = new EmailInput();
            typeString(input, 'ab');
            input.handleKey(key('home'));
            const spy = vi.spyOn(input, 'markDirty');

            input.handleKey(key('right'));

            expect(spy).toHaveBeenCalled();
        });

        it('is called when home key is pressed', () => {
            const input = new EmailInput();
            typeString(input, 'ab');
            const spy = vi.spyOn(input, 'markDirty');

            input.handleKey(key('home'));

            expect(spy).toHaveBeenCalled();
        });

        it('is called when end key is pressed', () => {
            const input = new EmailInput();
            typeString(input, 'ab');
            input.handleKey(key('home'));
            const spy = vi.spyOn(input, 'markDirty');

            input.handleKey(key('end'));

            expect(spy).toHaveBeenCalled();
        });

        it('is called when autocomplete changes the value', () => {
            const input = new EmailInput({}, { domains: ['gmail.com'] });
            typeString(input, 'u@g');
            const spy = vi.spyOn(input, 'markDirty');

            input.handleKey(key('tab'));

            expect(spy).toHaveBeenCalled();
        });

        it('is NOT called when ctrl-char is pressed (no change)', () => {
            const input = new EmailInput();
            const spy = vi.spyOn(input, 'markDirty');

            input.handleKey(key('a', { ctrl: true }));

            expect(spy).not.toHaveBeenCalled();
        });
    });

    // ─────────────────────────────────────────────────────
    // 10. Robustness
    // ─────────────────────────────────────────────────────

    describe('robustness', () => {
        it('renders without throwing at minimum width (1)', () => {
            const input = new EmailInput();
            typeString(input, 'a@b.com');
            expect(() => {
                const screen = new Screen(1, 3);
                input.updateRect({ x: 0, y: 0, width: 1, height: 3 });
                input.render(screen);
            }).not.toThrow();
        });

        it('renders without throwing at zero width', () => {
            const input = new EmailInput();
            typeString(input, 'a@b.com');
            expect(() => {
                const screen = new Screen(1, 3);
                input.updateRect({ x: 0, y: 0, width: 0, height: 3 });
                input.render(screen);
            }).not.toThrow();
        });

        it('renders without throwing at zero height', () => {
            const input = new EmailInput();
            typeString(input, 'a@b.com');
            expect(() => {
                const screen = new Screen(40, 1);
                input.updateRect({ x: 0, y: 0, width: 40, height: 0 });
                input.render(screen);
            }).not.toThrow();
        });

        it('renders a very long email without throwing', () => {
            const input = new EmailInput();
            const longEmail = 'a'.repeat(200) + '@' + 'b'.repeat(100) + '.com';
            typeString(input, longEmail);
            expect(() => renderRow(input, 40)).not.toThrow();
        });

        it('repeated backspace past the start does not throw', () => {
            const input = new EmailInput();
            typeString(input, 'abc');
            expect(() => {
                for (let i = 0; i < 10; i++) {
                    input.handleKey(key('backspace'));
                }
            }).not.toThrow();
            expect(input.getValue()).toBe('');
        });

        it('repeated delete past the end does not throw', () => {
            const input = new EmailInput();
            typeString(input, 'abc');
            input.handleKey(key('home'));
            expect(() => {
                for (let i = 0; i < 10; i++) {
                    input.handleKey(key('delete'));
                }
            }).not.toThrow();
            expect(input.getValue()).toBe('');
        });

        it('repeated left beyond position 0 does not throw', () => {
            const input = new EmailInput();
            typeString(input, 'ab');
            expect(() => {
                for (let i = 0; i < 10; i++) {
                    input.handleKey(key('left'));
                }
            }).not.toThrow();
        });

        it('repeated right beyond length does not throw', () => {
            const input = new EmailInput();
            typeString(input, 'ab');
            expect(() => {
                for (let i = 0; i < 10; i++) {
                    input.handleKey(key('right'));
                }
            }).not.toThrow();
        });

        it('getValue() is always a string regardless of operations performed', () => {
            const input = new EmailInput();
            expect(typeof input.getValue()).toBe('string');
            typeString(input, 'test@example.com');
            expect(typeof input.getValue()).toBe('string');
            input.handleKey(key('backspace'));
            expect(typeof input.getValue()).toBe('string');
        });
    });
});
