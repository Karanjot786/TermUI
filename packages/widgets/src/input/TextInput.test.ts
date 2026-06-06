import { describe, it, expect } from 'vitest';
import { TextInput } from './TextInput.js';

describe('TextInput', () => {
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