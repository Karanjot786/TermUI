// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for MultilineTextInput widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { MultilineTextInput } from './MultilineTextInput.js';

// ── Helper ─────────────────────────────────────────────
function makeInput(opts = {}) {
    return new MultilineTextInput({}, opts);
}

function typeText(input: MultilineTextInput, text: string) {
    for (const char of text) {
        input.insertChar(char);
    }
}

// ── Initial state ──────────────────────────────────────
describe('MultilineTextInput — initial state', () => {
    it('starts with an empty value', () => {
        const input = makeInput();
        expect(input.value).toBe('');
    });

    it('exposes focusable=true', () => {
        const input = makeInput();
        expect(input.focusable).toBe(true);
    });
});

// ── Character insertion ────────────────────────────────
describe('MultilineTextInput — character insertion', () => {
    it('inserts a single character', () => {
        const input = makeInput();
        input.insertChar('a');
        expect(input.value).toBe('a');
    });

    it('inserts multiple characters in order', () => {
        const input = makeInput();
        typeText(input, 'hello');
        expect(input.value).toBe('hello');
    });

    it('inserts a newline and splits into two lines', () => {
        const input = makeInput();
        typeText(input, 'hello');
        input.insertNewline();
        typeText(input, 'world');
        expect(input.value).toBe('hello\nworld');
    });

    it('inserting multiple newlines creates blank lines', () => {
        const input = makeInput();
        input.insertNewline();
        input.insertNewline();
        expect(input.value).toBe('\n\n');
    });
});

// ── Backspace / delete ─────────────────────────────────
describe('MultilineTextInput — deletion', () => {
    it('deleteBack removes the character before the cursor', () => {
        const input = makeInput();
        typeText(input, 'abc');
        input.deleteBack();
        expect(input.value).toBe('ab');
    });

    it('deleteBack at column 0 merges with previous line', () => {
        const input = makeInput();
        typeText(input, 'foo');
        input.insertNewline();
        typeText(input, 'bar');
        input.moveCursorHome();      // move to col 0 of line 1
        input.deleteBack();          // should merge
        expect(input.value).toBe('foobar');
    });

    it('deleteBack at the very start does nothing', () => {
        const input = makeInput();
        input.deleteBack();
        expect(input.value).toBe('');
    });

    it('deleteForward removes the character after the cursor', () => {
        const input = makeInput();
        typeText(input, 'abc');
        input.moveCursorHome();
        input.deleteForward();
        expect(input.value).toBe('bc');
    });

    it('deleteForward at line end merges next line', () => {
        const input = makeInput();
        typeText(input, 'foo');
        input.insertNewline();
        typeText(input, 'bar');
        // move back to end of first line
        input.moveCursorUp();
        input.moveCursorEnd();
        input.deleteForward();
        expect(input.value).toBe('foobar');
    });
});

// ── Cursor navigation ──────────────────────────────────
describe('MultilineTextInput — cursor navigation', () => {
    it('moveCursorLeft moves within a line', () => {
        const input = makeInput();
        typeText(input, 'abc');
        input.moveCursorLeft();
        input.insertChar('X');
        expect(input.value).toBe('abXc');
    });

    it('moveCursorLeft at col 0 wraps to end of previous line', () => {
        const input = makeInput();
        typeText(input, 'foo');
        input.insertNewline();
        input.moveCursorLeft();      // from col 0 of line 1 → end of line 0
        input.insertChar('!');
        expect(input.value).toBe('foo!\n');
    });

    it('moveCursorRight at line end wraps to next line start', () => {
        const input = makeInput();
        typeText(input, 'abc');
        input.insertNewline();
        typeText(input, 'def');
        input.moveCursorUp();
        input.moveCursorEnd();
        input.moveCursorRight();    // wraps to line 1, col 0
        input.insertChar('X');
        expect(input.value).toBe('abc\nXdef');
    });

    it('moveCursorUp moves to previous line, clamping column', () => {
        const input = makeInput();
        typeText(input, 'hi');          // line 0: 'hi'
        input.insertNewline();
        typeText(input, 'longer');      // line 1: 'longer'
        input.moveCursorEnd();          // col 6
        input.moveCursorUp();           // col clamped to 2 (length of 'hi')
        input.insertChar('!');
        expect(input.value).toBe('hi!\nlonger');
    });

    it('moveCursorDown moves to next line, clamping column', () => {
        const input = makeInput();
        typeText(input, 'longer');      // line 0
        input.insertNewline();
        typeText(input, 'hi');          // line 1
        // move back up and to end of line 0
        input.moveCursorUp();
        input.moveCursorEnd();          // col 6
        input.moveCursorDown();         // clamp to col 2
        input.insertChar('!');
        expect(input.value).toBe('longer\nhi!');
    });

    it('moveCursorHome sets col to 0', () => {
        const input = makeInput();
        typeText(input, 'hello');
        input.moveCursorHome();
        input.insertChar('^');
        expect(input.value).toBe('^hello');
    });

    it('moveCursorEnd sets col to line length', () => {
        const input = makeInput();
        typeText(input, 'hello');
        input.moveCursorHome();
        input.moveCursorEnd();
        input.insertChar('!');
        expect(input.value).toBe('hello!');
    });
});

// ── onChange callback ──────────────────────────────────
describe('MultilineTextInput — onChange callback', () => {
    it('fires onChange when a character is inserted', () => {
        const onChange = vi.fn();
        const input = makeInput({ onChange });
        input.insertChar('x');
        expect(onChange).toHaveBeenCalledWith('x');
    });

    it('fires onChange with the full new value on each change', () => {
        const onChange = vi.fn();
        const input = makeInput({ onChange });
        typeText(input, 'ab');
        input.insertNewline();
        expect(onChange).toHaveBeenLastCalledWith('ab\n');
    });

    it('fires onChange when deleteBack is called', () => {
        const onChange = vi.fn();
        const input = makeInput({ onChange });
        input.insertChar('a');
        input.deleteBack();
        expect(onChange).toHaveBeenLastCalledWith('');
    });

    it('fires onChange when clear() is called', () => {
        const onChange = vi.fn();
        const input = makeInput({ onChange });
        typeText(input, 'hello');
        input.clear();
        expect(onChange).toHaveBeenLastCalledWith('');
    });
});

// ── handleKey dispatch ─────────────────────────────────
describe('MultilineTextInput — handleKey', () => {
    it('handleKey "enter" inserts a newline', () => {
        const input = makeInput();
        typeText(input, 'a');
        input.handleKey({ key: 'enter' } as any);
        typeText(input, 'b');
        expect(input.value).toBe('a\nb');
    });

    it('handleKey "backspace" deletes backwards', () => {
        const input = makeInput();
        typeText(input, 'abc');
        input.handleKey({ key: 'backspace' } as any);
        expect(input.value).toBe('ab');
    });

    it('handleKey printable char inserts it', () => {
        const input = makeInput();
        input.handleKey({ key: 'z', ctrl: false, alt: false } as any);
        expect(input.value).toBe('z');
    });

    it('handleKey ctrl+key is ignored for printing', () => {
        const input = makeInput();
        input.handleKey({ key: 'c', ctrl: true, alt: false } as any);
        expect(input.value).toBe('');
    });

    it('handleKey up/down/left/right move cursor without throwing', () => {
        const input = makeInput();
        typeText(input, 'hello');
        input.insertNewline();
        typeText(input, 'world');
        expect(() => {
            input.handleKey({ key: 'up' } as any);
            input.handleKey({ key: 'left' } as any);
            input.handleKey({ key: 'right' } as any);
            input.handleKey({ key: 'down' } as any);
            input.handleKey({ key: 'home' } as any);
            input.handleKey({ key: 'end' } as any);
        }).not.toThrow();
    });
});

// ── Value setter ───────────────────────────────────────
describe('MultilineTextInput — value setter', () => {
    it('sets value programmatically', () => {
        const input = makeInput();
        input.value = 'line1\nline2\nline3';
        expect(input.value).toBe('line1\nline2\nline3');
    });

    it('clear() resets the value', () => {
        const input = makeInput();
        input.value = 'some text';
        input.clear();
        expect(input.value).toBe('');
    });
});
