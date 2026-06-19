// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for TextInput widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { TextInput } from './TextInput.js';
import { Screen, type KeyEvent } from '@termuijs/core';

function renderTextInput(input: TextInput, width = 20, height = 3) {
    const screen = new Screen(width, height);
    input.updateRect({ x: 0, y: 0, width, height });
    input.render(screen);
    return screen;
}

// Helper to create mock key events for testing handleKey
function createMockKeyEvent(key: string, ctrl = false, alt = false, shift = false): KeyEvent {
    return {
        key,
        raw: Buffer.from([]),
        ctrl,
        alt,
        shift,
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
    };
}

describe('TextInput', () => {
    it('initializes with correct default values and properties', () => {
        const input = new TextInput({}, { placeholder: 'Type here', maxLength: 10 });
        expect(input.value).toBe('');
        expect(input.focusable).toBe(true);
        expect(input.style.border).toBe('single');
        expect(input.style.height).toBe(3);
    });

    it('sets and gets value correctly', () => {
        const input = new TextInput({}, { maxLength: 5 });
        input.value = 'hello world';
        expect(input.value).toBe('hello'); // truncated to maxLength
    });

    it('handles char insertion and triggers onChange within maxLength limit', () => {
        const onChangeSpy = vi.fn();
        const input = new TextInput({}, { maxLength: 3, onChange: onChangeSpy });
        
        input.insertChar('a');
        expect(input.value).toBe('a');
        expect(onChangeSpy).toHaveBeenCalledWith('a');

        input.insertChar('b');
        input.insertChar('c');
        expect(input.value).toBe('abc');

        // Should not insert beyond maxLength
        input.insertChar('d');
        expect(input.value).toBe('abc');
    });

    it('deletes characters back and forward', () => {
        const input = new TextInput();
        input.value = 'abcdef';
        
        // Position cursor at index 3 (between c and d)
        input.moveCursorHome();
        input.moveCursorRight(); // 1
        input.moveCursorRight(); // 2
        input.moveCursorRight(); // 3
        
        // Delete backward (should delete 'c')
        input.deleteBack();
        expect(input.value).toBe('abdef');
        
        // Delete forward (should delete 'd')
        input.deleteForward();
        expect(input.value).toBe('abef');
    });

    it('moves cursor correctly and respects boundaries', () => {
        const input = new TextInput();
        input.value = 'ab';
        
        // Starts at end of value (since value set doesn't move cursor, let's verify)
        input.moveCursorEnd();
        input.moveCursorRight(); // Try to go past right boundary
        input.moveCursorRight();
        
        input.moveCursorLeft(); // Move left
        input.insertChar('c'); // Insert at cursor index 1
        expect(input.value).toBe('acb');

        input.moveCursorHome(); // Move to start
        input.insertChar('d'); // Insert at index 0
        expect(input.value).toBe('dacb');
    });

    it('triggers onSubmit on submit', () => {
        const onSubmitSpy = vi.fn();
        const input = new TextInput({}, { onSubmit: onSubmitSpy });
        input.value = 'hello';
        
        input.submit();
        
        expect(onSubmitSpy).toHaveBeenCalledWith('hello');
    });

    it('clears value and cursor position on clear', () => {
        const onChangeSpy = vi.fn();
        const input = new TextInput({}, { onChange: onChangeSpy });
        input.value = 'abc';
        input.moveCursorEnd();
        
        input.clear();
        
        expect(input.value).toBe('');
        expect(onChangeSpy).toHaveBeenCalledWith('');
    });

    it('renders placeholder when empty and unfocused', () => {
        const input = new TextInput({}, { placeholder: 'Placeholder' });
        const screen = renderTextInput(input, 20, 3);
        
        // Note: TextInput has height 3 and border 'single'.
        // Content area is inside the border, at y = 1, x = 1 (width - 2).
        const contentRow = screen.back[1].map(c => c.char).join('');
        expect(contentRow).toContain('Placeholder');
    });

    it('renders actual value when populated', () => {
        const input = new TextInput();
        input.value = 'hello';
        const screen = renderTextInput(input, 20, 3);
        
        const contentRow = screen.back[1].map(c => c.char).join('');
        expect(contentRow).toContain('hello');
    });

    it('renders masked characters when mask is provided', () => {
        const input = new TextInput({}, { mask: '*' });
        input.value = 'secret';
        const screen = renderTextInput(input, 20, 3);
        
        const contentRow = screen.back[1].map(c => c.char).join('');
        expect(contentRow).toContain('******');
        expect(contentRow).not.toContain('secret');
    });

    it('renders cursor when focused', () => {
        const input = new TextInput();
        input.value = 'ab';
        input.isFocused = true;
        
        // Position cursor at index 1 ('b')
        input.moveCursorHome();
        input.moveCursorRight();
        
        const screen = renderTextInput(input, 20, 3);
        
        // Character at cursor ('b') should be underlined in default insert mode
        const cell = screen.back[1][2]; // x=1 is start of content, x=2 is index 1 of value
        expect(cell.char).toBe('b');
        expect(cell.underline).toBe(true);
    });

    it('scrolls value view horizontally when text exceeds viewport width', () => {
        // Content width is 5 (7 - 2 for borders). Visible area leaves 1 cell for cursor, so 4 cells visible.
        const input = new TextInput();
        input.value = 'abcdefgh';
        input.isFocused = true;
        input.moveCursorEnd(); // Cursor is at index 8
        
        const screen = renderTextInput(input, 7, 3);
        
        // The view should scroll. Visible width = 4, so scrollX = 8 - 4 = 4.
        // Slice: displayValue.slice(4, 8) -> 'efgh'.
        const contentRow = screen.back[1].map(c => c.char).join('');
        expect(contentRow).toContain('efgh');
        expect(contentRow).not.toContain('abcd');
    });

    it('marks dirty when value setter is used', () => {
        const input = new TextInput();
        input.clearDirty();
        input.value = 'hello';
        expect(input.isDirty).toBe(true);
    });

    it('marks dirty after insertChar()', () => {
        const input = new TextInput();
        input.clearDirty();
        input.insertChar('A');
        expect(input.isDirty).toBe(true);
    });

    it('marks dirty after deleteBack()', () => {
        const input = new TextInput();
        input.value = 'abc';
        input.moveCursorEnd();
        input.clearDirty();
        input.deleteBack();
        expect(input.isDirty).toBe(true);
    });

    it('marks dirty after deleteForward()', () => {
        const input = new TextInput();
        input.value = 'abc';
        input.moveCursorHome();
        input.clearDirty();
        input.deleteForward();
        expect(input.isDirty).toBe(true);
    });

    it('marks dirty after clear()', () => {
        const input = new TextInput();
        input.value = 'abc';
        input.clearDirty();
        input.clear();
        expect(input.isDirty).toBe(true);
    });

    it('marks dirty after cursor movement', () => {
        const input = new TextInput();
        input.value = 'abc';

        input.moveCursorEnd();
        input.clearDirty();
        input.moveCursorLeft();
        expect(input.isDirty).toBe(true);

        input.clearDirty();
        input.moveCursorRight();
        expect(input.isDirty).toBe(true);

        input.clearDirty();
        input.moveCursorHome();
        expect(input.isDirty).toBe(true);

        input.clearDirty();
        input.moveCursorEnd();
        expect(input.isDirty).toBe(true);
    });
});

describe('handleKey', () => {
    it('inserts printable characters', () => {
        const input = new TextInput();
        input.handleKey(createMockKeyEvent('a'));
        input.handleKey(createMockKeyEvent('b'));
        expect(input.value).toBe('ab');
    });

    it('ignores single characters with modifiers', () => {
        const input = new TextInput();
        input.handleKey(createMockKeyEvent('c', true)); // ctrl+c
        expect(input.value).toBe('');
    });

    it('handles backspace', () => {
        const input = new TextInput();
        input.value = 'hello';
        input.moveCursorEnd();
        input.handleKey(createMockKeyEvent('backspace'));
        expect(input.value).toBe('hell');
    });

    it('handles delete', () => {
        const input = new TextInput();
        input.value = 'hello';
        input.moveCursorHome();
        input.handleKey(createMockKeyEvent('delete'));
        expect(input.value).toBe('ello');
    });

    it('handles left and right arrow keys', () => {
        const input = new TextInput();
        input.value = 'abc';
        input.moveCursorEnd();
        
        input.handleKey(createMockKeyEvent('left'));
        input.handleKey(createMockKeyEvent('delete'));
        expect(input.value).toBe('ab');
    });

    it('handles home and end keys', () => {
        const input = new TextInput();
        input.value = 'abc';
        
        input.handleKey(createMockKeyEvent('home'));
        input.handleKey(createMockKeyEvent('delete'));
        expect(input.value).toBe('bc');
        
        input.handleKey(createMockKeyEvent('end'));
        input.handleKey(createMockKeyEvent('backspace'));
        expect(input.value).toBe('b');
    });

    it('handles enter key to submit', () => {
        const onSubmitSpy = vi.fn();
        const input = new TextInput({}, { onSubmit: onSubmitSpy });
        input.value = 'done';
        
        input.handleKey(createMockKeyEvent('enter'));
        expect(onSubmitSpy).toHaveBeenCalledWith('done');
    });
});

describe('Performance optimizations', () => {
    it('does not mark dirty when moveCursorLeft is called at the start', () => {
        const input = new TextInput();

        input.moveCursorHome();
        input.clearDirty();

        input.moveCursorLeft();

        expect(input.isDirty).toBe(false);
    });

    it('does not mark dirty when moveCursorRight is called at the end', () => {
        const input = new TextInput();
        input.value = 'abc';
        input.moveCursorEnd();

        input.clearDirty();

        input.moveCursorRight();

        expect(input.isDirty).toBe(false);
    });

    it('does not mark dirty when moveCursorHome is called at home position', () => {
        const input = new TextInput();

        input.moveCursorHome();
        input.clearDirty();

        input.moveCursorHome();

        expect(input.isDirty).toBe(false);
    });

    it('does not mark dirty when moveCursorEnd is called at end position', () => {
        const input = new TextInput();
        input.value = 'abc';
        input.moveCursorEnd();

        input.clearDirty();

        input.moveCursorEnd();

        expect(input.isDirty).toBe(false);
    });
});
