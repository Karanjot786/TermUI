import { Buffer } from 'node:buffer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TextInput } from '@termuijs/widgets';
import { PasswordInput } from './PasswordInput.js';
import { Screen, createKeyEvent } from '@termuijs/core';

function renderInput(input: TextInput | PasswordInput, width = 30, height = 3) {
    const screen = new Screen(width, height);
    input.updateRect({ x: 0, y: 0, width, height });
    input.render(screen);
    return screen;
}

describe('Vim keybindings (TextInput & PasswordInput)', () => {
    beforeEach(() => {
        vi.stubEnv('TERMUI_KEYBINDINGS', 'vim');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('initializes in normal mode when TERMUI_KEYBINDINGS=vim', () => {
        const textInput = new TextInput();
        const pwdInput = new PasswordInput();
        expect(textInput.vimMode).toBe('normal');
        expect(pwdInput.vimMode).toBe('normal');
    });

    it('transitions to insert mode on "i" and back to normal on "escape"', () => {
        const textInput = new TextInput();
        expect(textInput.vimMode).toBe('normal');

        textInput.handleKey(createKeyEvent({ key: 'i', ctrl: false, shift: false, alt: false, raw: Buffer.from('i') }));
        expect(textInput.vimMode).toBe('insert');

        textInput.handleKey(createKeyEvent({ key: 'escape', ctrl: false, shift: false, alt: false, raw: Buffer.from('\x1b') }));
        expect(textInput.vimMode).toBe('normal');
    });

    it('transitions to visual mode on "v" and back to normal on "escape"', () => {
        const textInput = new TextInput();
        textInput.handleKey(createKeyEvent({ key: 'v', ctrl: false, shift: false, alt: false, raw: Buffer.from('v') }));
        expect(textInput.vimMode).toBe('visual');

        textInput.handleKey(createKeyEvent({ key: 'escape', ctrl: false, shift: false, alt: false, raw: Buffer.from('\x1b') }));
        expect(textInput.vimMode).toBe('normal');
    });

    it('moves cursor left/right in normal mode via "h" and "l"', () => {
        const textInput = new TextInput();
        textInput.value = 'hello';
        textInput.isFocused = true;
        textInput.vimMode = 'normal';

        // Go to end, then try normal mode navigation
        textInput.moveCursorEnd();
        let screen = renderInput(textInput, 30, 3);
        // Column 6 (x: 1 + 5 = 6) should have inverse: true (block cursor)
        expect(screen.back[1][6].inverse).toBe(true);

        // h moves left -> cursor should be at index 4 (pointing to 'o')
        textInput.handleKey(createKeyEvent({ key: 'h', ctrl: false, shift: false, alt: false, raw: Buffer.from('h') }));
        screen = renderInput(textInput, 30, 3);
        expect(screen.back[1][5].inverse).toBe(true);
        expect(screen.back[1][5].char).toBe('o');

        // l moves right -> cursor should be back at index 5
        textInput.handleKey(createKeyEvent({ key: 'l', ctrl: false, shift: false, alt: false, raw: Buffer.from('l') }));
        screen = renderInput(textInput, 30, 3);
        expect(screen.back[1][6].inverse).toBe(true);
    });

    it('deletes characters under cursor via "x" in normal mode', () => {
        const textInput = new TextInput();
        textInput.value = 'abc';
        textInput.isFocused = true;
        textInput.vimMode = 'normal';

        // Position cursor at 'b' (index 1)
        textInput.moveCursorHome();
        textInput.moveCursorRight();
        let screen = renderInput(textInput, 30, 3);
        expect(screen.back[1][2].char).toBe('b');
        expect(screen.back[1][2].inverse).toBe(true);

        textInput.handleKey(createKeyEvent({ key: 'x', ctrl: false, shift: false, alt: false, raw: Buffer.from('x') }));
        expect(textInput.value).toBe('ac');
        screen = renderInput(textInput, 30, 3);
        expect(screen.back[1][2].char).toBe('c');
        expect(screen.back[1][2].inverse).toBe(true);
    });

    it('handles j and k as tab focus cycling keys in normal mode', () => {
        const textInput = new TextInput();

        const eventJ = createKeyEvent({ key: 'j', ctrl: false, shift: false, alt: false, raw: Buffer.from('j') });
        textInput.handleKey(eventJ);
        expect(eventJ.key).toBe('tab');
        expect(eventJ.shift).toBe(false);

        const eventK = createKeyEvent({ key: 'k', ctrl: false, shift: false, alt: false, raw: Buffer.from('k') });
        textInput.handleKey(eventK);
        expect(eventK.key).toBe('tab');
        expect(eventK.shift).toBe(true);
    });

    it('renders block cursor in normal mode vs line cursor in insert mode', () => {
        const textInput = new TextInput();
        textInput.value = 'abc';
        textInput.isFocused = true;

        // Normal mode -> block cursor (inverse: true, underline: false/undefined)
        textInput.vimMode = 'normal';
        const screenNormal = renderInput(textInput, 30, 3);
        const normalCell = screenNormal.back[1][1]; // first char
        expect(normalCell.inverse).toBe(true);
        expect(normalCell.underline).toBeFalsy();

        // Insert mode -> line cursor (inverse: false, underline: true)
        textInput.vimMode = 'insert';
        const screenInsert = renderInput(textInput, 30, 3);
        const insertCell = screenInsert.back[1][1];
        expect(insertCell.inverse).toBe(false);
        expect(insertCell.underline).toBe(true);
    });

    it('renders mode indicator when focused', () => {
        const textInput = new TextInput();
        textInput.value = 'abc';
        textInput.isFocused = true;
        textInput.vimMode = 'normal';

        const screen = renderInput(textInput, 30, 3);
        const rendered = screen.back[1].map(c => c.char).join('');
        expect(rendered).toContain('-- NORMAL --');
    });
});
