import { describe, it, expect, vi, afterEach } from 'vitest';
import { ColorPicker } from './ColorPicker.js';
import { type KeyEvent, caps, Screen, parseColor } from '@termuijs/core';

const makeKeyEvent = (key: string): KeyEvent => ({
    key,
    raw: Buffer.alloc(0),
    ctrl: false,
    alt: false,
    shift: false,
    stopPropagation: () => {},
    preventDefault: () => {}
});

describe('ColorPicker', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes with the correct default value and resolves palette index', () => {
        const picker = new ColorPicker({ value: '#ff0000' }); // red hex
        expect(picker.value).toEqual(parseColor('#ff0000'));
        expect(picker.focusable).toBe(true);
    });

    it('navigates the palette grid using arrow keys and triggers onChange', () => {
        const onChange = vi.fn();
        const picker = new ColorPicker({ value: 'black', onChange }); // first color (index 0)

        // Navigate right (index 0 -> 1, which is red)
        picker.handleKey(makeKeyEvent('right'));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenLastCalledWith(parseColor('red'));

        // Navigate down (index 1 -> 9, which is brightRed)
        picker.handleKey(makeKeyEvent('down'));
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(onChange).toHaveBeenLastCalledWith(parseColor('brightRed'));

        // Navigate up (index 9 -> 1, which is red)
        picker.handleKey(makeKeyEvent('up'));
        expect(onChange).toHaveBeenCalledTimes(3);
        expect(onChange).toHaveBeenLastCalledWith(parseColor('red'));

        // Navigate left (index 1 -> 0, which is black)
        picker.handleKey(makeKeyEvent('left'));
        expect(onChange).toHaveBeenCalledTimes(4);
        expect(onChange).toHaveBeenLastCalledWith(parseColor('black'));
    });

    it('edits hex text value directly, parses it to update selection and fires onChange', () => {
        const onChange = vi.fn();
        const picker = new ColorPicker({ value: '#ffffff', onChange });

        // Let's press backspace to remove 'f' (leaves 'fffff')
        picker.handleKey(makeKeyEvent('backspace'));
        // Length 5 is not a valid hex color length (3 or 6), so no onChange
        expect(onChange).not.toHaveBeenCalled();

        // Let's backspace all the way to empty
        picker.handleKey(makeKeyEvent('backspace')); // 'ffff'
        picker.handleKey(makeKeyEvent('backspace')); // 'fff' -> valid length 3!
        // '#fff' parses to '#ffffff'
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenLastCalledWith(parseColor('#ffffff'));

        // Clear onChange mocks
        onChange.mockClear();

        // Backspace again to 'ff' (invalid)
        picker.handleKey(makeKeyEvent('backspace'));
        expect(onChange).not.toHaveBeenCalled();

        // Type '0' -> 'ff0' (yellow, valid!)
        picker.handleKey(makeKeyEvent('0'));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenLastCalledWith(parseColor('#ffff00'));
    });

    it('supports unicode and ascii fallbacks for rendering', () => {
        const picker = new ColorPicker({ value: 'red' });
        const screen = new Screen(40, 7);

        picker.mount();
        picker.updateRect({ x: 0, y: 0, width: 40, height: 7 });

        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        picker.render(screen);

        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        picker.markDirty();
        picker.render(screen);
    });
});
