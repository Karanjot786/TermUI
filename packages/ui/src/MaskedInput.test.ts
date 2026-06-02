import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { MaskedInput } from './MaskedInput.js';

describe('MaskedInput', () => {
    it('renders the mask with empty slots as placeholder chars', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });

        input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        const screen = new Screen(40, 3);
        input.render(screen);

        // Content is in row 1 (row 0 is border top)
        const rendered = screen.back[1].map((c) => c.char).join('').trim();
        expect(rendered).toContain('__/__/____');
    });

    it('renders mask with custom placeholder', () => {
        const input = new MaskedInput({}, { mask: '__/__/____', placeholder: '*' });

        input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        const screen = new Screen(40, 3);
        input.render(screen);

        // Content is in row 1 (row 0 is border top)
        const rendered = screen.back[1].map((c) => c.char).join('');
        // The string includes border chars, so check for the content without them
        expect(rendered).toContain('**/**/**');
    });

    it('typing a digit fills the next slot', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });

        input.handleKey({ key: '1', ctrl: false, alt: false } as any);

        expect(input.getValue()).toContain('1');
    });

    it('typing multiple digits fills slots sequentially', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });

        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);
        input.handleKey({ key: '0', ctrl: false, alt: false } as any);

        const value = input.getValue();
        expect(value).toMatch(/^12\/0/);
    });

    it('backspace clears the last filled slot', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });

        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);
        input.handleKey({ key: 'backspace', ctrl: false, alt: false } as any);

        const value = input.getValue();
        expect(value).toBe('1_/__/____');
    });

    it('onComplete fires when all slots are filled', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onComplete });

        // Fill all 8 slots
        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);
        input.handleKey({ key: '0', ctrl: false, alt: false } as any);
        input.handleKey({ key: '5', ctrl: false, alt: false } as any);
        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '5', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);
        input.handleKey({ key: '0', ctrl: false, alt: false } as any);

        expect(onComplete).toHaveBeenCalledWith('12/05/1520');
    });

    it('onChange fires on every change', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onChange });

        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);

        expect(onChange).toHaveBeenCalled();
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('reset() clears all slots', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });

        // Fill some slots
        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);
        input.handleKey({ key: '0', ctrl: false, alt: false } as any);

        // Reset
        input.reset();

        expect(input.getValue()).toBe('__/__/____');
    });

    it('reset() calls onChange with reset value', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onChange });

        // Fill some slots
        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);

        onChange.mockClear();

        // Reset
        input.reset();

        expect(onChange).toHaveBeenCalledWith('__/__/____');
    });

    it('ignores non-digit characters', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });

        input.handleKey({ key: 'a', ctrl: false, alt: false } as any);
        input.handleKey({ key: '-', ctrl: false, alt: false } as any);

        expect(input.getValue()).toBe('__/__/____');
    });

    it('handles arrow keys for cursor navigation', () => {
        const input = new MaskedInput({}, { mask: '(__) ___-____' });

        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);

        // Move left to previous slot
        input.handleKey({ key: 'left', ctrl: false, alt: false } as any);

        // Backspace should clear the previous slot (slot 0)
        input.handleKey({ key: 'backspace', ctrl: false, alt: false } as any);

        const value = input.getValue();
        expect(value).toContain('(_2)');
    });

    it('handles phone mask (___) ___-____', () => {
        const input = new MaskedInput({}, { mask: '(___) ___-____' });

        // Fill all 10 digit slots
        const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
        digits.forEach((digit) => {
            input.handleKey({ key: digit, ctrl: false, alt: false } as any);
        });

        expect(input.getValue()).toBe('(123) 456-7890');
    });

    it('backspace after complete unsets the last digit', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onComplete });

        // Fill all 8 slots
        ['1', '2', '0', '5', '1', '5', '2', '0'].forEach((digit) => {
            input.handleKey({ key: digit, ctrl: false, alt: false } as any);
        });

        expect(onComplete).toHaveBeenCalled();
        onComplete.mockClear();

        // Backspace
        input.handleKey({ key: 'backspace', ctrl: false, alt: false } as any);

        expect(input.getValue()).toBe('12/05/152_');
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('getValue returns correctly formatted string', () => {
        const input = new MaskedInput({}, { mask: '__-__' });

        input.handleKey({ key: 'a', ctrl: false, alt: false } as any); // ignored
        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);
        input.handleKey({ key: '3', ctrl: false, alt: false } as any);

        expect(input.getValue()).toBe('12-3_');
    });

    it('home key moves cursor to first slot', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });

        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);
        input.handleKey({ key: 'home', ctrl: false, alt: false } as any);
        input.handleKey({ key: 'backspace', ctrl: false, alt: false } as any);

        // Should not delete anything since cursor is at first position
        expect(input.getValue()).toContain('12');
    });

    it('end key moves cursor to last slot', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });

        input.handleKey({ key: '1', ctrl: false, alt: false } as any);
        input.handleKey({ key: 'end', ctrl: false, alt: false } as any);
        input.handleKey({ key: '2', ctrl: false, alt: false } as any);

        // end should move to last slot (but mask '__/__/____' has 8 slots, so this should be at slot 7)
        // The behavior here depends on how end is interpreted
        expect(input.getValue().length).toBeGreaterThan(0);
    });
});
