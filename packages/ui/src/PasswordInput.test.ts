// ─────────────────────────────────────────────────────
// @termuijs/ui — PasswordInput tests
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { render } from '@termuijs/testing';
import { createElement, useRef } from '@termuijs/jsx';
import { PasswordInput } from './PasswordInput.js';
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
function typeString(input: PasswordInput, str: string): void {
    for (const ch of str) {
        input.handleKey(key(ch));
    }
}

/**
 * Render the widget into a fresh Screen and return the text of the
 * content row (row 1 — row 0 and row 2 are border lines).
 */
function renderRow(input: PasswordInput, width = 40): string {
    const screen = new Screen(width, 3);
    input.updateRect({ x: 0, y: 0, width, height: 3 });
    input.render(screen);
    return screen.back[1].map(c => c.char).join('');
}

// ─────────────────────────────────────────────────────
// Original tests (preserved)
// ─────────────────────────────────────────────────────

describe('PasswordInput', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders a mask instead of the raw characters', () => {
        let input!: PasswordInput;
        const screen = render(createElement(() => {
            const ref = useRef<PasswordInput | null>(null);
            if (!ref.current) {
                ref.current = new PasswordInput();
                ref.current.value = 'secret';
            }
            input = ref.current;
            return ref.current;
        }, null));

        const maskChar = (input as any)._maskChar;
        const expectedDisplay = maskChar.repeat(6);

        expect(screen.lastFrame().join('\n')).toContain(expectedDisplay);
        expect(screen.lastFrame().join('\n')).not.toContain('secret');
        screen.unmount();
    });

    it('updates value on keypress', () => {
        let input!: PasswordInput;
        const screen = render(createElement(() => {
            const ref = useRef<PasswordInput | null>(null);
            if (!ref.current) {
                ref.current = new PasswordInput();
            }
            input = ref.current;
            return ref.current;
        }, null));

        input.handleKey({ key: 'p', ctrl: false, shift: false, alt: false, raw: Buffer.from('p'), stopPropagation: () => {}, preventDefault: () => {} });
        screen.rerender();

        expect(input.value).toBe('p');

        const maskChar = (input as any)._maskChar;
        expect(screen.lastFrame().join('\n')).toContain(maskChar);
        screen.unmount();
    });

    // ─────────────────────────────────────────────────────
    // 1. Constructor & Initialization
    // ─────────────────────────────────────────────────────

    describe('constructor & initialization', () => {
        it('default value is empty string', () => {
            const input = new PasswordInput();
            expect(input.value).toBe('');
        });

        it('showText defaults to false', () => {
            const input = new PasswordInput();
            expect(input.showText).toBe(false);
        });

        it('widget is focusable', () => {
            const input = new PasswordInput();
            expect(input.focusable).toBe(true);
        });

        it('stores placeholder correctly', () => {
            const input = new PasswordInput({}, { placeholder: 'Enter password' });
            // Confirm placeholder renders when empty and unfocused
            const row = renderRow(input);
            expect(row).toContain('Enter password');
        });

        it('default maxLength is Infinity', () => {
            const input = new PasswordInput();
            // A very long value should be stored fully
            const long = 'x'.repeat(200);
            input.value = long;
            expect(input.value).toBe(long);
        });

        it('constructor without arguments produces stable defaults', () => {
            const input = new PasswordInput();
            expect(input.value).toBe('');
            expect(input.showText).toBe(false);
            expect(input.focusable).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────
    // 2. Value Setter
    // ─────────────────────────────────────────────────────

    describe('value setter', () => {
        it('stores the assigned value', () => {
            const input = new PasswordInput();
            input.value = 'secret';
            expect(input.value).toBe('secret');
        });

        it('truncates to maxLength when value is assigned directly', () => {
            const input = new PasswordInput({}, { maxLength: 4 });
            input.value = 'abcdef';
            expect(input.value).toBe('abcd');
        });

        it('assigns empty string', () => {
            const input = new PasswordInput();
            input.value = 'something';
            input.value = '';
            expect(input.value).toBe('');
        });

        it('clamps cursor to new value length on assignment', () => {
            const input = new PasswordInput();
            input.value = 'abcdef';
            input.moveCursorEnd();
            // Now shorten value — cursor should clamp
            input.value = 'ab';
            // After assignment cursor should be at most 2
            // Inserting a char at cursor should produce 'abX'
            typeString(input, 'X');
            expect(input.value).toBe('abX');
        });
    });

    // ─────────────────────────────────────────────────────
    // 3. Mask Rendering
    // ─────────────────────────────────────────────────────

    describe('mask rendering', () => {
        it('masks empty password correctly', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = '';
            const row = renderRow(input);
            expect(row).not.toContain('●');
        });

        it('masks single character', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = 'a';
            const row = renderRow(input);
            expect(row).toContain('●');
            expect(row).not.toContain('a');
        });

        it('mask length matches password length for "secret"', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = 'secret';
            const row = renderRow(input);
            const maskCount = row.split('●').length - 1;
            expect(maskCount).toBe(6);
            expect(row).not.toContain('secret');
        });

        it('masks a long password', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = 'verylongpassword';
            const row = renderRow(input, 80);
            expect(row).not.toContain('verylongpassword');
        });

        it('raw password never appears in any row when showText is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = 'supersecret';
            const screen = new Screen(40, 3);
            input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
            input.render(screen);
            const allText = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
            expect(allText).not.toContain('supersecret');
        });
    });

    // ─────────────────────────────────────────────────────
    // 4. ASCII Fallback
    // ─────────────────────────────────────────────────────

    describe('ASCII fallback', () => {
        it('uses * instead of ● when unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const input = new PasswordInput();
            input.value = 'secret';
            const row = renderRow(input);
            expect(row).toContain('*');
            expect(row).not.toContain('●');
        });

        it('uses ● when unicode is true', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = 'secret';
            const row = renderRow(input);
            expect(row).toContain('●');
            expect(row).not.toContain('*');
        });
    });

    // ─────────────────────────────────────────────────────
    // 5. Visibility Toggle
    // ─────────────────────────────────────────────────────

    describe('visibility toggle', () => {
        it('toggleVisibility flips showText from false to true', () => {
            const input = new PasswordInput();
            expect(input.showText).toBe(false);
            input.toggleVisibility();
            expect(input.showText).toBe(true);
        });

        it('toggleVisibility flips showText from true to false', () => {
            const input = new PasswordInput();
            input.toggleVisibility();
            expect(input.showText).toBe(true);
            input.toggleVisibility();
            expect(input.showText).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────
    // 6. Alt+V Shortcut
    // ─────────────────────────────────────────────────────

    describe('Alt+V shortcut', () => {
        it('Alt+V toggles showText to true', () => {
            const input = new PasswordInput();
            input.handleKey(key('v', { alt: true }));
            expect(input.showText).toBe(true);
        });

        it('Alt+V toggles showText back to false', () => {
            const input = new PasswordInput();
            input.handleKey(key('v', { alt: true }));
            input.handleKey(key('v', { alt: true }));
            expect(input.showText).toBe(false);
        });

        it('Alt+V does not insert a character', () => {
            const input = new PasswordInput();
            input.handleKey(key('v', { alt: true }));
            expect(input.value).toBe('');
        });
    });

    // ─────────────────────────────────────────────────────
    // 7. Visible Text Rendering
    // ─────────────────────────────────────────────────────

    describe('visible text rendering', () => {
        it('shows real text when showText is true', () => {
            const input = new PasswordInput();
            input.value = 'secret';
            input.toggleVisibility();
            const row = renderRow(input);
            expect(row).toContain('secret');
        });

        it('does not show mask characters when visible', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = 'secret';
            input.toggleVisibility();
            const row = renderRow(input);
            // Should not have mask bullets for the content
            // (there may be borders or spaces, but not bullet masks)
            expect(row).not.toMatch(/●{6}/);
        });
    });

    // ─────────────────────────────────────────────────────
    // 8. Visibility Indicator
    // ─────────────────────────────────────────────────────

    describe('visibility indicator', () => {
        it('shows unicode 👁 indicator when text is visible and unicode enabled', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = 'secret';
            input.toggleVisibility();
            const row = renderRow(input, 40);
            expect(row).toContain('👁');
        });

        it('shows ASCII [v] indicator when text is visible and unicode disabled', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const input = new PasswordInput();
            input.value = 'secret';
            input.toggleVisibility();
            const row = renderRow(input, 40);
            expect(row).toContain('[v]');
        });

        it('does not show indicator when text is masked', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = 'secret';
            // showText is false by default
            const row = renderRow(input, 40);
            expect(row).not.toContain('👁');
            expect(row).not.toContain('[v]');
        });
    });

    // ─────────────────────────────────────────────────────
    // 9. Character Input
    // ─────────────────────────────────────────────────────

    describe('character input', () => {
        it('typing a, b, c produces "abc"', () => {
            const input = new PasswordInput();
            typeString(input, 'abc');
            expect(input.value).toBe('abc');
        });

        it('onChange is fired for each character', () => {
            const onChange = vi.fn();
            const input = new PasswordInput({}, { onChange });
            typeString(input, 'abc');
            expect(onChange).toHaveBeenCalledTimes(3);
        });

        it('onChange receives the latest value on each call', () => {
            const onChange = vi.fn();
            const input = new PasswordInput({}, { onChange });
            typeString(input, 'abc');
            expect(onChange.mock.calls[0][0]).toBe('a');
            expect(onChange.mock.calls[1][0]).toBe('ab');
            expect(onChange.mock.calls[2][0]).toBe('abc');
        });
    });

    // ─────────────────────────────────────────────────────
    // 10. maxLength Enforcement
    // ─────────────────────────────────────────────────────

    describe('maxLength enforcement', () => {
        it('typing beyond maxLength is ignored', () => {
            const input = new PasswordInput({}, { maxLength: 3 });
            typeString(input, 'abcdef');
            expect(input.value).toBe('abc');
        });

        it('onChange is not called for rejected characters', () => {
            const onChange = vi.fn();
            const input = new PasswordInput({}, { maxLength: 2, onChange });
            typeString(input, 'abcdef');
            // Only the first 2 characters trigger onChange
            expect(onChange).toHaveBeenCalledTimes(2);
        });

        it('value setter also respects maxLength', () => {
            const input = new PasswordInput({}, { maxLength: 5 });
            input.value = 'toolongstring';
            expect(input.value).toBe('toolo');
        });
    });

    // ─────────────────────────────────────────────────────
    // 11. Backspace
    // ─────────────────────────────────────────────────────

    describe('backspace', () => {
        it('deletes the last character', () => {
            const input = new PasswordInput();
            typeString(input, 'abc');
            input.handleKey(key('backspace'));
            expect(input.value).toBe('ab');
        });

        it('calls onChange after backspace', () => {
            const onChange = vi.fn();
            const input = new PasswordInput({}, { onChange });
            typeString(input, 'abc');
            onChange.mockClear();
            input.handleKey(key('backspace'));
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith('ab');
        });

        it('backspace at position 0 does not error', () => {
            const input = new PasswordInput();
            expect(() => input.handleKey(key('backspace'))).not.toThrow();
            expect(input.value).toBe('');
        });

        it('cursor decrements after backspace', () => {
            const input = new PasswordInput();
            typeString(input, 'abc'); // cursor at 3
            input.handleKey(key('backspace')); // cursor → 2
            // Inserting at cursor 2 should append at end of 'ab'
            typeString(input, 'X');
            expect(input.value).toBe('abX');
        });
    });

    // ─────────────────────────────────────────────────────
    // 12. Delete Key
    // ─────────────────────────────────────────────────────

    describe('delete key', () => {
        it('deletes character at cursor position', () => {
            const input = new PasswordInput();
            typeString(input, 'abcd');
            input.handleKey(key('home'));      // cursor → 0
            input.handleKey(key('right'));     // cursor → 1
            input.handleKey(key('delete'));    // delete 'b'
            expect(input.value).toBe('acd');
        });

        it('calls onChange after delete', () => {
            const onChange = vi.fn();
            const input = new PasswordInput({}, { onChange });
            typeString(input, 'abc');
            input.handleKey(key('home'));
            onChange.mockClear();
            input.handleKey(key('delete'));
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith('bc');
        });

        it('delete at end of string does nothing', () => {
            const input = new PasswordInput();
            typeString(input, 'abc');
            // cursor is at end by default
            expect(() => input.handleKey(key('delete'))).not.toThrow();
            expect(input.value).toBe('abc');
        });
    });

    // ─────────────────────────────────────────────────────
    // 13. Cursor Navigation
    // ─────────────────────────────────────────────────────

    describe('cursor navigation', () => {
        it('moveCursorLeft moves cursor left', () => {
            const input = new PasswordInput();
            typeString(input, 'abc'); // cursor at 3
            input.moveCursorLeft();    // cursor → 2
            // Insert at cursor 2 → 'abXc'
            typeString(input, 'X');
            expect(input.value).toBe('abXc');
        });

        it('moveCursorRight moves cursor right', () => {
            const input = new PasswordInput();
            typeString(input, 'abc');
            input.moveCursorHome();     // cursor → 0
            input.moveCursorRight();    // cursor → 1
            typeString(input, 'X');
            expect(input.value).toBe('aXbc');
        });

        it('moveCursorHome moves cursor to position 0', () => {
            const input = new PasswordInput();
            typeString(input, 'abc');
            input.moveCursorHome();
            typeString(input, 'X');
            expect(input.value).toBe('Xabc');
        });

        it('moveCursorEnd moves cursor to end of value', () => {
            const input = new PasswordInput();
            typeString(input, 'abc');
            input.moveCursorHome();
            input.moveCursorEnd();
            typeString(input, 'X');
            expect(input.value).toBe('abcX');
        });

        it('handleKey left/right/home/end delegate correctly', () => {
            const input = new PasswordInput();
            typeString(input, 'abc');
            input.handleKey(key('home'));
            typeString(input, 'X');
            expect(input.value).toBe('Xabc');

            input.handleKey(key('end'));
            typeString(input, 'Y');
            expect(input.value).toBe('XabcY');

            input.handleKey(key('left'));
            typeString(input, 'Z');
            expect(input.value).toBe('XabcZY');
        });
    });

    // ─────────────────────────────────────────────────────
    // 14. Boundary Cursor Cases
    // ─────────────────────────────────────────────────────

    describe('boundary cursor cases', () => {
        it('left at position 0 does not go below 0', () => {
            const input = new PasswordInput();
            typeString(input, 'ab');
            input.moveCursorHome();
            input.moveCursorLeft();
            input.moveCursorLeft();
            // Still at 0 — inserting here goes to front
            typeString(input, 'Z');
            expect(input.value).toBe('Zab');
        });

        it('right at end does not exceed value length', () => {
            const input = new PasswordInput();
            typeString(input, 'ab');
            input.moveCursorRight();
            input.moveCursorRight();
            // Still at end — inserting appends
            typeString(input, 'Z');
            expect(input.value).toBe('abZ');
        });

        it('home from any position goes to 0', () => {
            const input = new PasswordInput();
            typeString(input, 'abcde');
            input.moveCursorLeft();
            input.moveCursorLeft();
            input.moveCursorHome();
            typeString(input, 'X');
            expect(input.value.startsWith('X')).toBe(true);
        });

        it('end from any position goes to length', () => {
            const input = new PasswordInput();
            typeString(input, 'abcde');
            input.moveCursorHome();
            input.moveCursorEnd();
            typeString(input, 'X');
            expect(input.value.endsWith('X')).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────
    // 15. Submit Callback
    // ─────────────────────────────────────────────────────

    describe('submit callback', () => {
        it('enter fires onSubmit with current value', () => {
            const onSubmit = vi.fn();
            const input = new PasswordInput({}, { onSubmit });
            input.value = 'secret';
            input.handleKey(key('enter'));
            expect(onSubmit).toHaveBeenCalledWith('secret');
        });

        it('return fires onSubmit with current value', () => {
            const onSubmit = vi.fn();
            const input = new PasswordInput({}, { onSubmit });
            input.value = 'secret';
            input.handleKey(key('return'));
            expect(onSubmit).toHaveBeenCalledWith('secret');
        });

        it('onSubmit is not called when no callback is provided', () => {
            const input = new PasswordInput();
            input.value = 'secret';
            expect(() => input.handleKey(key('enter'))).not.toThrow();
        });

        it('submit() method directly fires onSubmit', () => {
            const onSubmit = vi.fn();
            const input = new PasswordInput({}, { onSubmit });
            input.value = 'pass';
            input.submit();
            expect(onSubmit).toHaveBeenCalledWith('pass');
        });
    });

    // ─────────────────────────────────────────────────────
    // 16. clear()
    // ─────────────────────────────────────────────────────

    describe('clear()', () => {
        it('resets value to empty string', () => {
            const input = new PasswordInput();
            input.value = 'abc';
            input.clear();
            expect(input.value).toBe('');
        });

        it('resets cursor to 0', () => {
            const input = new PasswordInput();
            typeString(input, 'abc');
            input.clear();
            // After clear, inserting should produce 'X' with cursor at 1
            typeString(input, 'X');
            expect(input.value).toBe('X');
        });

        it('calls onChange with empty string', () => {
            const onChange = vi.fn();
            const input = new PasswordInput({}, { onChange });
            input.value = 'abc';
            onChange.mockClear();
            input.clear();
            expect(onChange).toHaveBeenCalledWith('');
        });
    });

    // ─────────────────────────────────────────────────────
    // 17. markDirty Coverage
    // ─────────────────────────────────────────────────────

    describe('markDirty is called for all mutating operations', () => {
        it('insertChar calls markDirty', () => {
            const input = new PasswordInput();
            const spy = vi.spyOn(input as any, 'markDirty');
            input.insertChar('a');
            expect(spy).toHaveBeenCalled();
        });

        it('deleteBack calls markDirty', () => {
            const input = new PasswordInput();
            input.value = 'ab';
            input.moveCursorEnd();
            const spy = vi.spyOn(input as any, 'markDirty');
            input.deleteBack();
            expect(spy).toHaveBeenCalled();
        });

        it('deleteForward calls markDirty', () => {
            const input = new PasswordInput();
            input.value = 'ab';
            const spy = vi.spyOn(input as any, 'markDirty');
            input.deleteForward();
            expect(spy).toHaveBeenCalled();
        });

        it('clear() calls markDirty', () => {
            const input = new PasswordInput();
            input.value = 'abc';
            const spy = vi.spyOn(input as any, 'markDirty');
            input.clear();
            expect(spy).toHaveBeenCalled();
        });

        it('toggleVisibility calls markDirty', () => {
            const input = new PasswordInput();
            const spy = vi.spyOn(input as any, 'markDirty');
            input.toggleVisibility();
            expect(spy).toHaveBeenCalled();
        });

        it('moveCursorLeft calls markDirty', () => {
            const input = new PasswordInput();
            input.value = 'abc';
            const spy = vi.spyOn(input as any, 'markDirty');
            input.moveCursorLeft();
            expect(spy).toHaveBeenCalled();
        });

        it('moveCursorRight calls markDirty', () => {
            const input = new PasswordInput();
            const spy = vi.spyOn(input as any, 'markDirty');
            input.moveCursorRight();
            expect(spy).toHaveBeenCalled();
        });

        it('moveCursorHome calls markDirty', () => {
            const input = new PasswordInput();
            const spy = vi.spyOn(input as any, 'markDirty');
            input.moveCursorHome();
            expect(spy).toHaveBeenCalled();
        });

        it('moveCursorEnd calls markDirty', () => {
            const input = new PasswordInput();
            const spy = vi.spyOn(input as any, 'markDirty');
            input.moveCursorEnd();
            expect(spy).toHaveBeenCalled();
        });
    });

    // ─────────────────────────────────────────────────────
    // 18. Placeholder Rendering
    // ─────────────────────────────────────────────────────

    describe('placeholder rendering', () => {
        it('placeholder renders when value is empty and widget is unfocused', () => {
            const input = new PasswordInput({}, { placeholder: 'Enter password' });
            const row = renderRow(input);
            expect(row).toContain('Enter password');
        });

        it('placeholder is not shown when value is set', () => {
            const input = new PasswordInput({}, { placeholder: 'Enter password' });
            input.value = 'abc';
            const row = renderRow(input);
            expect(row).not.toContain('Enter password');
        });

        it('no placeholder if none given', () => {
            const input = new PasswordInput();
            const row = renderRow(input);
            // Should render without error, just empty content area
            expect(row).toBeDefined();
        });
    });

    // ─────────────────────────────────────────────────────
    // 19. Focused Empty Input
    // ─────────────────────────────────────────────────────

    describe('focused empty input', () => {
        it('placeholder disappears when widget is focused', () => {
            const input = new PasswordInput({}, { placeholder: 'Enter password' });
            // Simulate focus
            (input as any).isFocused = true;
            const row = renderRow(input);
            expect(row).not.toContain('Enter password');
        });
    });

    // ─────────────────────────────────────────────────────
    // 20. Unsupported Keys
    // ─────────────────────────────────────────────────────

    describe('unsupported keys', () => {
        const unsupportedKeys = ['escape', 'tab', 'f1', 'pageup', 'pagedown'];

        for (const k of unsupportedKeys) {
            it(`key "${k}" does not modify value or throw`, () => {
                const input = new PasswordInput();
                input.value = 'safe';
                expect(() => input.handleKey(key(k))).not.toThrow();
                expect(input.value).toBe('safe');
            });
        }
    });

    // ─────────────────────────────────────────────────────
    // 21. Scroll Handling
    // ─────────────────────────────────────────────────────

    describe('scroll handling', () => {
        it('rendering a password longer than widget width does not throw', () => {
            const input = new PasswordInput();
            input.value = 'a'.repeat(100);
            expect(() => renderRow(input, 20)).not.toThrow();
        });

        it('cursor stays visible after many characters exceed width', () => {
            const input = new PasswordInput();
            // Type 50 chars into a 20-wide widget
            typeString(input, 'x'.repeat(50));
            expect(() => renderRow(input, 20)).not.toThrow();
        });

        it('render produces a valid substring when scrolled', () => {
            const input = new PasswordInput();
            input.value = 'a'.repeat(50);
            const row = renderRow(input, 20);
            expect(typeof row).toBe('string');
        });
    });

    // ─────────────────────────────────────────────────────
    // 22. Unicode Password Content
    // ─────────────────────────────────────────────────────

    describe('unicode password content', () => {
        it('stores and retrieves unicode password correctly', () => {
            const input = new PasswordInput();
            input.value = 'pässwörd';
            expect(input.value).toBe('pässwörd');
        });

        it('stores and retrieves CJK password correctly', () => {
            const input = new PasswordInput();
            input.value = '密码';
            expect(input.value).toBe('密码');
        });

        it('stores emoji password correctly', () => {
            const input = new PasswordInput();
            input.value = '🔒abc';
            expect(input.value).toBe('🔒abc');
        });

        it('shows actual unicode text when visible', () => {
            const input = new PasswordInput();
            input.value = 'pässwörd';
            input.toggleVisibility();
            const row = renderRow(input, 40);
            expect(row).toContain('pässwörd');
        });

        it('masks unicode content (does not show raw unicode chars)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const input = new PasswordInput();
            input.value = '密码';
            const row = renderRow(input, 40);
            expect(row).not.toContain('密码');
        });
    });

    // ─────────────────────────────────────────────────────
    // 23. Getter Coverage
    // ─────────────────────────────────────────────────────

    describe('getter coverage', () => {
        it('value getter always reflects latest state', () => {
            const input = new PasswordInput();
            expect(input.value).toBe('');
            input.value = 'hello';
            expect(input.value).toBe('hello');
            input.clear();
            expect(input.value).toBe('');
        });

        it('showText getter always reflects latest state', () => {
            const input = new PasswordInput();
            expect(input.showText).toBe(false);
            input.toggleVisibility();
            expect(input.showText).toBe(true);
            input.toggleVisibility();
            expect(input.showText).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────
    // 24. Repeated Toggle Stability
    // ─────────────────────────────────────────────────────

    describe('repeated toggle stability', () => {
        it('20 toggles produce no errors and correct final state', () => {
            const input = new PasswordInput();
            expect(() => {
                for (let i = 0; i < 20; i++) {
                    input.toggleVisibility();
                }
            }).not.toThrow();
            // 20 toggles → even → back to false
            expect(input.showText).toBe(false);
        });

        it('21 toggles result in showText === true', () => {
            const input = new PasswordInput();
            for (let i = 0; i < 21; i++) {
                input.toggleVisibility();
            }
            expect(input.showText).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────
    // 25. Rendering Stability
    // ─────────────────────────────────────────────────────

    describe('rendering stability', () => {
        it('render with empty input does not throw', () => {
            const input = new PasswordInput();
            expect(() => renderRow(input)).not.toThrow();
        });

        it('render with visible input does not throw', () => {
            const input = new PasswordInput();
            input.value = 'secret';
            input.toggleVisibility();
            expect(() => renderRow(input)).not.toThrow();
        });

        it('render with hidden input does not throw', () => {
            const input = new PasswordInput();
            input.value = 'secret';
            expect(() => renderRow(input)).not.toThrow();
        });

        it('render with very long password does not throw', () => {
            const input = new PasswordInput();
            input.value = 'x'.repeat(500);
            expect(() => renderRow(input, 40)).not.toThrow();
        });

        it('render with unicode password does not throw', () => {
            const input = new PasswordInput();
            input.value = '密码🔒pässwörd';
            expect(() => renderRow(input, 40)).not.toThrow();
        });

        it('render with width=0 does not throw', () => {
            const input = new PasswordInput();
            input.value = 'secret';
            const screen = new Screen(0, 3);
            input.updateRect({ x: 0, y: 0, width: 0, height: 3 });
            expect(() => input.render(screen)).not.toThrow();
        });

        it('render with height=0 does not throw', () => {
            const input = new PasswordInput();
            input.value = 'secret';
            const screen = new Screen(40, 0);
            input.updateRect({ x: 0, y: 0, width: 40, height: 0 });
            expect(() => input.render(screen)).not.toThrow();
        });
    });
});
