// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for MultilineTextInput widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
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

function renderInput(input: MultilineTextInput, width = 20, height = 6): Screen {
    const screen = new Screen(Math.max(width, 0), Math.max(height, 0));
    input.updateRect({ x: 0, y: 0, width, height });
    input.render(screen);
    return screen;
}

function screenText(screen: Screen): string {
    return screen.back.map((row) => row.map((cell) => cell.char).join('')).join('\n');
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row]?.map((cell) => cell.char).join('') ?? '';
}

afterEach(() => {
    vi.restoreAllMocks();
});

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

// ── Placeholder rendering ─────────────────────────────
describe('MultilineTextInput — placeholder rendering', () => {
    it('renders the placeholder when empty and unfocused', () => {
        const input = makeInput({ placeholder: 'Write notes...' });
        const screen = renderInput(input, 24, 4);

        expect(screenText(screen)).toContain('Write notes...');
    });

    it('does not render the placeholder when focused', () => {
        const input = makeInput({ placeholder: 'Write notes...' });
        input.isFocused = true;

        const screen = renderInput(input, 24, 4);

        expect(screenText(screen)).not.toContain('Write notes...');
        expect(screen.back[1]?.[1]?.inverse).toBe(true);
    });

    it('renders no placeholder text when the placeholder is empty', () => {
        const input = makeInput({ placeholder: '' });
        const screen = renderInput(input, 16, 4);

        expect(screenText(screen)).not.toContain('undefined');
        expect(rowText(screen, 1).slice(1, -1).trim()).toBe('');
    });
});

// ── Submit behavior ───────────────────────────────────
describe('MultilineTextInput — submit behavior', () => {
    it('calls onSubmit with the full multiline value', () => {
        const onSubmit = vi.fn();
        const input = makeInput({ onSubmit });
        typeText(input, 'alpha');
        input.insertNewline();
        typeText(input, 'beta');

        input.submit();

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith('alpha\nbeta');
    });

    it('submits an empty input', () => {
        const onSubmit = vi.fn();
        const input = makeInput({ onSubmit });

        input.submit();

        expect(onSubmit).toHaveBeenCalledWith('');
    });

    it('does not modify content when submitting', () => {
        const input = makeInput({ onSubmit: vi.fn() });
        input.value = 'one\ntwo';

        input.submit();

        expect(input.value).toBe('one\ntwo');
    });
});

// ── Cursor boundary cases ─────────────────────────────
describe('MultilineTextInput — cursor boundary cases', () => {
    it('moveCursorLeft at the start of the first line does nothing', () => {
        const input = makeInput();

        input.moveCursorLeft();
        input.insertChar('x');

        expect(input.value).toBe('x');
    });

    it('moveCursorRight at the end of the last line does nothing', () => {
        const input = makeInput();
        input.value = 'abc\ndef';
        input.moveCursorDown();
        input.moveCursorEnd();

        input.moveCursorRight();
        input.insertChar('!');

        expect(input.value).toBe('abc\ndef!');
    });

    it('moveCursorUp on the first line does nothing', () => {
        const input = makeInput();
        typeText(input, 'abc');
        input.moveCursorHome();

        input.moveCursorUp();
        input.insertChar('^');

        expect(input.value).toBe('^abc');
    });

    it('moveCursorDown on the last line does nothing', () => {
        const input = makeInput();
        input.value = 'abc\ndef';
        input.moveCursorDown();
        input.moveCursorEnd();

        input.moveCursorDown();
        input.insertChar('!');

        expect(input.value).toBe('abc\ndef!');
    });

    it('repeated boundary movements remain stable', () => {
        const input = makeInput();

        for (let i = 0; i < 5; i++) {
            input.moveCursorLeft();
            input.moveCursorUp();
        }
        input.insertChar('a');
        for (let i = 0; i < 5; i++) {
            input.moveCursorRight();
            input.moveCursorDown();
        }
        input.insertChar('b');

        expect(input.value).toBe('ab');
    });
});

// ── Value setter edge cases ────────────────────────────
describe('MultilineTextInput — value setter edge cases', () => {
    it('setting value to an empty string resets correctly', () => {
        const input = makeInput();
        input.value = 'old\nvalue';

        input.value = '';
        input.insertChar('x');

        expect(input.value).toBe('x');
    });

    it('setting value to a single newline creates two logical lines', () => {
        const input = makeInput();

        input.value = '\n';
        input.moveCursorDown();
        input.insertChar('x');

        expect(input.value).toBe('\nx');
    });

    it('preserves the cursor within valid bounds after setting value', () => {
        const input = makeInput();
        typeText(input, 'abcdef');
        input.moveCursorLeft();
        input.moveCursorLeft();

        input.value = 'xyz';
        input.insertChar('!');

        expect(input.value).toBe('xyz!');
    });

    it('replaces existing content with shorter content correctly', () => {
        const input = makeInput();
        input.value = 'long first line\nlong second line';
        input.moveCursorDown();
        input.moveCursorEnd();

        input.value = 'short';
        input.insertChar('!');

        expect(input.value).toBe('short!');
    });
});

// ── Soft wrap behavior ────────────────────────────────
describe('MultilineTextInput — soft wrap behavior', () => {
    it('wraps long lines across multiple display rows', () => {
        const input = makeInput();
        input.value = 'abcdefghi';

        const screen = renderInput(input, 6, 6);

        expect(rowText(screen, 1)).toContain('abcd');
        expect(rowText(screen, 2)).toContain('efgh');
        expect(rowText(screen, 3)).toContain('i');
    });

    it('preserves empty lines in wrapped output', () => {
        const input = makeInput();
        input.value = 'aa\n\nbb';

        const screen = renderInput(input, 6, 6);

        expect(rowText(screen, 1)).toContain('aa');
        expect(rowText(screen, 2).slice(1, -1).trim()).toBe('');
        expect(rowText(screen, 3)).toContain('bb');
    });

    it('keeps cursor rendering accurate after wrapping', () => {
        const input = makeInput();
        input.value = 'abcdef';
        input.moveCursorEnd();
        input.isFocused = true;

        const screen = renderInput(input, 6, 5);

        expect(rowText(screen, 1)).toContain('abcd');
        expect(rowText(screen, 2)).toContain('ef');
        expect(screen.back[2]?.[3]?.inverse).toBe(true);
    });

    it('renders wrapped content without throwing', () => {
        const input = makeInput();
        input.value = 'abcdefghijklmnopqrstuvwxyz\n\n0123456789';

        expect(() => renderInput(input, 5, 5)).not.toThrow();
    });
});

// ── Rendering safety ──────────────────────────────────
describe('MultilineTextInput — rendering safety', () => {
    it('does not throw with width=0', () => {
        const input = makeInput();
        input.value = 'content';

        expect(() => renderInput(input, 0, 4)).not.toThrow();
    });

    it('does not throw with height=0', () => {
        const input = makeInput();
        input.value = 'content';

        expect(() => renderInput(input, 12, 0)).not.toThrow();
    });

    it('remains safe with very small dimensions', () => {
        const input = makeInput({ placeholder: 'tiny' });

        expect(() => renderInput(input, 1, 1)).not.toThrow();
    });

    it('renders long content into small widgets safely', () => {
        const input = makeInput();
        input.value = 'a'.repeat(200);

        expect(() => renderInput(input, 3, 3)).not.toThrow();
    });
});

// ── Dirty state ───────────────────────────────────────
describe('MultilineTextInput — dirty state', () => {
    it('editing operations call markDirty()', () => {
        const input = makeInput();
        input.value = 'ab';
        input.moveCursorHome();
        renderInput(input);
        const spy = vi.spyOn(input, 'markDirty');

        input.insertChar('x');
        input.insertNewline();
        input.deleteBack();
        input.deleteForward();

        expect(spy).toHaveBeenCalledTimes(4);
    });

    it('cursor movement operations call markDirty()', () => {
        const input = makeInput();
        input.value = 'ab\ncd';
        input.moveCursorDown();
        input.moveCursorEnd();
        renderInput(input);
        const spy = vi.spyOn(input, 'markDirty');

        input.moveCursorLeft();
        input.moveCursorRight();
        input.moveCursorUp();
        input.moveCursorDown();
        input.moveCursorHome();
        input.moveCursorEnd();

        expect(spy).toHaveBeenCalledTimes(6);
    });

    it('value setter calls markDirty()', () => {
        const input = makeInput();
        renderInput(input);
        const spy = vi.spyOn(input, 'markDirty');

        input.value = 'new value';

        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('clear operation calls markDirty()', () => {
        const input = makeInput();
        input.value = 'text';
        renderInput(input);
        const spy = vi.spyOn(input, 'markDirty');

        input.clear();

        expect(spy).toHaveBeenCalledTimes(1);
    });
});

// ── handleKey return values ────────────────────────────
describe('MultilineTextInput — handleKey return values', () => {
    it('returns true for supported keys', () => {
        const input = makeInput();

        for (const key of ['up', 'down', 'left', 'right', 'home', 'end', 'backspace', 'delete', 'return', 'enter', 'x']) {
            expect(input.handleKey({ key, ctrl: false, alt: false } as any)).toBe(true);
        }
    });

    it('returns false for unsupported keys', () => {
        const input = makeInput();

        expect(input.handleKey({ key: 'escape', ctrl: false, alt: false } as any)).toBe(false);
        expect(input.handleKey({ key: 'tab', ctrl: false, alt: false } as any)).toBe(false);
    });

    it('returns false for Ctrl/Alt printable keys and does not modify content', () => {
        const input = makeInput();

        expect(input.handleKey({ key: 'c', ctrl: true, alt: false } as any)).toBe(false);
        expect(input.handleKey({ key: 'x', ctrl: false, alt: true } as any)).toBe(false);
        expect(input.value).toBe('');
    });
});

// ── Delete edge cases ─────────────────────────────────
describe('MultilineTextInput — delete edge cases', () => {
    it('deleteForward at the end of the final line does nothing', () => {
        const input = makeInput();
        input.value = 'abc';
        input.moveCursorEnd();

        input.deleteForward();

        expect(input.value).toBe('abc');
    });

    it('deleteBack repeatedly on empty input remains safe', () => {
        const input = makeInput();

        expect(() => {
            for (let i = 0; i < 5; i++) input.deleteBack();
        }).not.toThrow();
        expect(input.value).toBe('');
    });

    it('deleteForward repeatedly on empty input remains safe', () => {
        const input = makeInput();

        expect(() => {
            for (let i = 0; i < 5; i++) input.deleteForward();
        }).not.toThrow();
        expect(input.value).toBe('');
    });
});

// ── Unicode / cursor rendering ────────────────────────
describe('MultilineTextInput — unicode and cursor rendering', () => {
    it('renders the cursor when focused', () => {
        const input = makeInput();
        input.value = 'abc';
        input.moveCursorHome();
        input.isFocused = true;

        const screen = renderInput(input, 12, 4);

        expect(screen.back[1]?.[1]?.char).toBe('a');
        expect(screen.back[1]?.[1]?.inverse).toBe(true);
    });

    it('does not render the cursor when unfocused', () => {
        const input = makeInput();
        input.value = 'abc';
        input.moveCursorHome();

        const screen = renderInput(input, 12, 4);

        expect(screen.back[1]?.[1]?.char).toBe('a');
        expect(screen.back[1]?.[1]?.inverse).not.toBe(true);
    });

    it('renders safely when caps.unicode is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const input = makeInput();
        input.value = 'abc';
        input.isFocused = true;

        expect(() => renderInput(input, 12, 4)).not.toThrow();
    });

    it('renders safely when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const input = makeInput();
        input.value = 'abc';
        input.isFocused = true;

        expect(() => renderInput(input, 12, 4)).not.toThrow();
    });
});
