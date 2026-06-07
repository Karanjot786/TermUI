import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, createKeyEvent, type KeyEvent } from '@termuijs/core';
import { NumberInput } from './NumberInput.js';

function key(name: string): KeyEvent {
    return createKeyEvent({
        key: name,
        raw: Buffer.from(name),
        ctrl: false,
        alt: false,
        shift: false,
    });
}

function renderInput(input: NumberInput, width = 24): string {
    const screen = new Screen(width, 3);
    input.updateRect({ x: 0, y: 0, width, height: 3 });
    input.render(screen);
    return screen.back.map((row) => row.map((cell) => cell.char).join('')).join('\n');
}

function typeText(input: NumberInput, text: string): void {
    for (const char of text) {
        input.insertChar(char);
    }
}

describe('NumberInput', () => {
    describe('constructor and initialization', () => {
        it('applies default options and starts empty', () => {
            const input = new NumberInput();

            expect(input.rawValue).toBe('');
            expect(input.numericValue).toBeNull();
            expect(input.focusable).toBe(true);

            input.increment();
            expect(input.rawValue).toBe('1');
        });

        it('stores and renders the placeholder while unfocused', () => {
            const input = new NumberInput({}, { placeholder: 'Amount' });

            expect(renderInput(input)).toContain('Amount');
        });
    });

    describe('numeric parsing', () => {
        it('parses integers, decimals, and negative values', () => {
            const input = new NumberInput();

            input.rawValue = '42';
            expect(input.numericValue).toBe(42);

            input.rawValue = '3.14';
            expect(input.numericValue).toBe(3.14);

            input.rawValue = '-7.5';
            expect(input.numericValue).toBe(-7.5);
        });

        it('returns null for empty, incomplete, and invalid values', () => {
            const input = new NumberInput();

            input.rawValue = '';
            expect(input.numericValue).toBeNull();

            input.rawValue = '-';
            expect(input.numericValue).toBeNull();

            input.rawValue = '12abc';
            expect(input.numericValue).toBeNull();
        });
    });

    describe('character validation', () => {
        it('accepts digits and rejects letters and symbols', () => {
            const input = new NumberInput();

            input.insertChar('1');
            input.insertChar('a');
            input.insertChar('$');

            expect(input.rawValue).toBe('1');
        });

        it('allows only one decimal point', () => {
            const input = new NumberInput();

            typeText(input, '1.2');
            input.insertChar('.');

            expect(input.rawValue).toBe('1.2');
        });

        it('blocks decimal points when decimals are disabled', () => {
            const input = new NumberInput({}, { allowDecimal: false });

            typeText(input, '12.5');

            expect(input.rawValue).toBe('125');
        });

        it('allows a negative sign only at position 0 when min is negative', () => {
            const input = new NumberInput({}, { min: -10 });

            input.insertChar('-');
            input.insertChar('5');
            input.insertChar('-');

            expect(input.rawValue).toBe('-5');
        });

        it('blocks a negative sign when min is zero or greater', () => {
            const input = new NumberInput({}, { min: 0 });

            input.insertChar('-');
            input.insertChar('3');

            expect(input.rawValue).toBe('3');
        });
    });

    describe('text editing', () => {
        it('inserts characters at the cursor and advances it', () => {
            const input = new NumberInput();

            typeText(input, '13');
            input.moveCursorLeft();
            input.insertChar('2');

            expect(input.rawValue).toBe('123');
        });

        it('deleteBack removes the previous character and is safe at the start', () => {
            const input = new NumberInput();

            input.deleteBack();
            expect(input.rawValue).toBe('');

            typeText(input, '123');
            input.deleteBack();
            expect(input.rawValue).toBe('12');
        });

        it('deleteForward removes the current character and is safe at the end', () => {
            const input = new NumberInput();

            typeText(input, '123');
            input.moveCursorHome();
            input.deleteForward();
            expect(input.rawValue).toBe('23');

            input.moveCursorEnd();
            input.deleteForward();
            expect(input.rawValue).toBe('23');
        });
    });

    describe('cursor navigation', () => {
        it('keeps the cursor between zero and the value length', () => {
            const input = new NumberInput();

            input.moveCursorLeft();
            input.insertChar('1');
            expect(input.rawValue).toBe('1');

            input.moveCursorRight();
            input.moveCursorRight();
            input.insertChar('2');
            expect(input.rawValue).toBe('12');
        });

        it('moves home to the start and end to the end', () => {
            const input = new NumberInput();

            typeText(input, '123');
            input.moveCursorHome();
            input.insertChar('0');
            expect(input.rawValue).toBe('0123');

            input.moveCursorEnd();
            input.insertChar('4');
            expect(input.rawValue).toBe('01234');
        });
    });

    describe('increment and decrement', () => {
        it('uses the configured step size from an empty state', () => {
            const input = new NumberInput({}, { step: 5 });

            input.increment();
            expect(input.rawValue).toBe('5');

            input.decrement();
            expect(input.rawValue).toBe('0');
        });

        it('works with decimals and negatives', () => {
            const input = new NumberInput({}, { step: 0.5, min: -10 });

            input.rawValue = '-1';
            input.increment();
            expect(input.rawValue).toBe('-0.5');

            input.decrement();
            input.decrement();
            expect(input.rawValue).toBe('-1.5');
        });

        it('updates the cursor position to the end', () => {
            const input = new NumberInput({}, { step: 5 });

            input.increment();
            input.insertChar('6');

            expect(input.rawValue).toBe('56');
        });

        it('triggers onChange with incremented and decremented values', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { step: 2, onChange });

            input.increment();
            input.decrement();

            expect(onChange).toHaveBeenNthCalledWith(1, 2);
            expect(onChange).toHaveBeenNthCalledWith(2, 0);
        });
    });

    describe('min and max clamping', () => {
        it('does not increment above max or decrement below min', () => {
            const input = new NumberInput({}, { min: 0, max: 10, step: 1 });

            input.rawValue = '10';
            input.increment();
            expect(input.rawValue).toBe('10');

            input.rawValue = '0';
            input.decrement();
            expect(input.rawValue).toBe('0');
        });

        it('clamps decimal values', () => {
            const input = new NumberInput({}, { min: 0, max: 1, step: 0.25 });

            input.rawValue = '0.9';
            input.increment();
            expect(input.rawValue).toBe('1');
        });

        it('clamps negative values', () => {
            const input = new NumberInput({}, { min: -2, max: 2, step: 1 });

            input.rawValue = '-2';
            input.decrement();

            expect(input.rawValue).toBe('-2');
        });
    });

    describe('change notifications', () => {
        it('fires onChange when inserting and deleting characters', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { onChange });

            input.insertChar('4');
            input.insertChar('2');
            input.deleteBack();
            input.deleteForward();

            expect(onChange).toHaveBeenNthCalledWith(1, 4);
            expect(onChange).toHaveBeenNthCalledWith(2, 42);
            expect(onChange).toHaveBeenNthCalledWith(3, 4);
            expect(onChange).toHaveBeenCalledTimes(3);
        });

        it('fires onChange when clearing input', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { onChange });

            typeText(input, '42');
            onChange.mockClear();
            input.clear();

            expect(onChange).toHaveBeenCalledWith(null);
        });
    });

    describe('submit handling', () => {
        it('submits null for empty input on enter and return', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { onSubmit });

            input.handleKey(key('enter'));
            input.handleKey(key('return'));

            expect(onSubmit).toHaveBeenNthCalledWith(1, null);
            expect(onSubmit).toHaveBeenNthCalledWith(2, null);
        });

        it('submits integer, negative, and decimal numeric values', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { onSubmit });

            input.rawValue = '42';
            input.submit();

            input.rawValue = '-8';
            input.submit();

            input.rawValue = '3.14';
            input.submit();

            expect(onSubmit).toHaveBeenNthCalledWith(1, 42);
            expect(onSubmit).toHaveBeenNthCalledWith(2, -8);
            expect(onSubmit).toHaveBeenNthCalledWith(3, 3.14);
        });
    });

    describe('clear functionality', () => {
        it('clears text, resets the cursor, triggers onChange, and marks dirty', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { onChange });

            typeText(input, '42');
            input.render(new Screen(10, 3));
            expect(input.isDirty).toBe(false);

            input.clear();
            input.insertChar('7');

            expect(input.rawValue).toBe('7');
            expect(onChange).toHaveBeenLastCalledWith(7);
            expect(input.isDirty).toBe(true);
        });
    });

    describe('keyboard handling', () => {
        it('handles digits, decimal point, and minus sign', () => {
            const input = new NumberInput({}, { min: -10 });

            input.handleKey(key('-'));
            input.handleKey(key('1'));
            input.handleKey(key('.'));
            input.handleKey(key('5'));

            expect(input.rawValue).toBe('-1.5');
        });

        it('handles editing and navigation keys', () => {
            const input = new NumberInput();

            typeText(input, '123');
            input.handleKey(key('left'));
            input.handleKey(key('backspace'));
            expect(input.rawValue).toBe('13');

            input.handleKey(key('home'));
            input.handleKey(key('delete'));
            expect(input.rawValue).toBe('3');

            input.handleKey(key('end'));
            input.handleKey(key('right'));
            input.handleKey(key('2'));
            expect(input.rawValue).toBe('32');
        });

        it('handles up and down keys', () => {
            const input = new NumberInput({}, { step: 3 });

            input.handleKey(key('up'));
            input.handleKey(key('down'));

            expect(input.rawValue).toBe('0');
        });

        it('ignores unsupported, ctrl, and alt keys', () => {
            const input = new NumberInput();

            input.handleKey(key('tab'));
            input.handleKey({ ...key('a'), ctrl: true });
            input.handleKey({ ...key('1'), alt: true });

            expect(input.rawValue).toBe('');
        });
    });

    describe('rendering', () => {
        it('renders its current value', () => {
            const input = new NumberInput();

            input.rawValue = '42';

            expect(renderInput(input)).toContain('42');
        });

        it('renders a focused cursor and step hint when there is room', () => {
            const input = new NumberInput({}, { step: 5 });

            input.isFocused = true;
            input.rawValue = '12';

            expect(renderInput(input, 16)).toContain('±5');
        });

        it('renders nothing when the content area has no space', () => {
            const input = new NumberInput({}, { placeholder: 'Amount' });

            expect(renderInput(input, 2)).not.toContain('Amount');
        });
    });

    describe('enhanced constructor tests', () => {
        it('applies custom placeholder', () => {
            const input = new NumberInput({}, { placeholder: 'Enter amount' });

            input.isFocused = false;
            expect(renderInput(input)).toContain('Enter amount');
        });

        it('applies custom step, min, and max options', () => {
            const input = new NumberInput({}, { step: 2.5, min: -100, max: 100 });

            input.increment();
            expect(input.rawValue).toBe('2.5');

            input.decrement();
            input.decrement();
            expect(input.rawValue).toBe('-2.5');
        });

        it('applies allowDecimal option correctly', () => {
            const input1 = new NumberInput({}, { allowDecimal: true });
            input1.insertChar('.');
            expect(input1.rawValue).toBe('.');

            const input2 = new NumberInput({}, { allowDecimal: false });
            input2.insertChar('.');
            expect(input2.rawValue).toBe('');
        });

        it('stores and invokes onChange callback', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { onChange });

            input.insertChar('5');
            expect(onChange).toHaveBeenCalledWith(5);
        });

        it('stores and invokes onSubmit callback', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { onSubmit });

            input.rawValue = '42';
            input.submit();
            expect(onSubmit).toHaveBeenCalledWith(42);
        });
    });

    describe('numeric parsing edge cases', () => {
        it('parses values starting with decimal point like ".5"', () => {
            const input = new NumberInput();

            input.rawValue = '.5';
            expect(input.numericValue).toBe(0.5);
        });

        it('parses values ending with decimal point like "5."', () => {
            const input = new NumberInput();

            input.rawValue = '5.';
            expect(input.numericValue).toBe(5);
        });

        it('parses very large numbers', () => {
            const input = new NumberInput();

            input.rawValue = '999999999999';
            expect(input.numericValue).toBe(999999999999);
        });

        it('parses very small negative numbers', () => {
            const input = new NumberInput();

            input.rawValue = '-0.000001';
            expect(input.numericValue).toBe(-0.000001);
        });

        it('handles negative zero', () => {
            const input = new NumberInput();

            input.rawValue = '-0';
            const value = input.numericValue;
            expect(Object.is(value, 0) || Object.is(value, -0)).toBe(true);
        });
    });

    describe('character validation edge cases', () => {
        it('blocks decimal point at position 0 when allowDecimal is true', () => {
            const input = new NumberInput({}, { allowDecimal: true });

            input.insertChar('.');
            expect(input.rawValue).toBe('.');

            input.insertChar('5');
            expect(input.rawValue).toBe('.5');
        });

        it('blocks multiple negative signs', () => {
            const input = new NumberInput({}, { min: -100 });

            input.insertChar('-');
            input.insertChar('5');
            input.moveCursorHome();
            input.moveCursorRight();
            input.insertChar('-');

            expect(input.rawValue).toBe('-5');
        });

        it('blocks negative sign in middle of string', () => {
            const input = new NumberInput({}, { min: -100 });

            input.insertChar('1');
            input.insertChar('2');
            input.moveCursorHome();
            input.moveCursorRight();
            input.insertChar('-');

            expect(input.rawValue).toBe('12');
        });

        it('combines validation rules: digits only, one decimal, one minus', () => {
            const input = new NumberInput({}, { min: -999, allowDecimal: true });

            input.insertChar('-');
            input.insertChar('1');
            input.insertChar('2');
            input.insertChar('.');
            input.insertChar('3');
            input.insertChar('.');
            input.insertChar('-');
            input.insertChar('a');

            expect(input.rawValue).toBe('-12.3');
        });
    });

    describe('cursor position management', () => {
        it('clamps cursor when rawValue is set externally', () => {
            const input = new NumberInput();

            input.rawValue = '1234';
            input.moveCursorEnd();

            input.rawValue = '12';
            expect(input.rawValue).toBe('12');
        });

        it('positions cursor correctly after increment', () => {
            const input = new NumberInput();

            input.increment();
            input.insertChar('0');

            expect(input.rawValue).toBe('10');
        });

        it('positions cursor correctly after decrement', () => {
            const input = new NumberInput();

            input.decrement();
            input.insertChar('0');

            expect(input.rawValue).toBe('-10');
        });

        it('maintains cursor bounds through multiple navigation operations', () => {
            const input = new NumberInput();

            typeText(input, '123');
            input.moveCursorHome();
            input.moveCursorLeft();
            input.moveCursorLeft();

            input.insertChar('0');
            expect(input.rawValue).toBe('0123');

            input.moveCursorEnd();
            input.moveCursorRight();
            input.moveCursorRight();

            input.insertChar('4');
            expect(input.rawValue).toBe('01234');
        });
    });

    describe('rendering comprehensive', () => {
        it('renders placeholder dimmed when focused but empty', () => {
            const input = new NumberInput({}, { placeholder: 'Enter value' });

            input.isFocused = true;
            const output = renderInput(input);

            expect(output).not.toContain('Enter value');
        });

        it('renders placeholder dimmed when unfocused and empty', () => {
            const input = new NumberInput({}, { placeholder: 'Enter value' });

            input.isFocused = false;
            const output = renderInput(input);

            expect(output).toContain('Enter value');
        });

        it('renders value with focused cursor visible', () => {
            const input = new NumberInput();

            input.rawValue = '42';
            input.isFocused = true;
            const output = renderInput(input);

            expect(output).toContain('42');
        });

        it('renders long values with scrolling', () => {
            const input = new NumberInput();

            input.rawValue = '123456789012345678';
            const output = renderInput(input, 10);

            expect(output.length).toBeGreaterThan(0);
        });

        it('renders step hint with varying step values', () => {
            const input1 = new NumberInput({}, { step: 10 });
            input1.isFocused = true;
            expect(renderInput(input1, 20)).toContain('±10');

            const input2 = new NumberInput({}, { step: 0.5 });
            input2.isFocused = true;
            expect(renderInput(input2, 20)).toContain('±0.5');
        });

        it('hides step hint when not enough width', () => {
            const input = new NumberInput({}, { step: 5 });

            input.isFocused = true;
            const output = renderInput(input, 8);

            expect(output).not.toContain('±5');
        });

        it('renders negative values correctly', () => {
            const input = new NumberInput();

            input.rawValue = '-42';
            expect(renderInput(input)).toContain('-42');
        });

        it('renders decimal values correctly', () => {
            const input = new NumberInput();

            input.rawValue = '3.14159';
            expect(renderInput(input)).toContain('3.14159');
        });

        it('handles zero width without crashing', () => {
            const input = new NumberInput();

            input.rawValue = '42';
            expect(() => renderInput(input, 0)).not.toThrow();
        });

        it('handles zero height without crashing', () => {
            const input = new NumberInput();

            input.rawValue = '42';
            const screen = new Screen(10, 0);
            input.updateRect({ x: 0, y: 0, width: 10, height: 0 });
            expect(() => input.render(screen)).not.toThrow();
        });

        it('renders cursor at correct position without scrolling', () => {
            const input = new NumberInput();

            input.rawValue = '123';
            input.isFocused = true;

            const screen = new Screen(10, 3);
            input.updateRect({ x: 0, y: 0, width: 10, height: 3 });
            input.render(screen);

            const firstRow = screen.back[0];
            const hasCursor = firstRow.some(cell => cell.inverse === true);
            expect(hasCursor || firstRow.some(cell => cell.char !== ' ')).toBe(true);
        });
    });

    describe('dirty state tracking', () => {
        it('marks dirty on insertChar', () => {
            const input = new NumberInput();

            const screen = new Screen(10, 3);
            input.updateRect({ x: 0, y: 0, width: 10, height: 3 });
            input.render(screen);

            expect(input.isDirty).toBe(false);

            input.insertChar('1');
            expect(input.isDirty).toBe(true);
        });

        it('marks dirty on deleteBack', () => {
            const input = new NumberInput();

            typeText(input, '42');
            const screen = new Screen(10, 3);
            input.updateRect({ x: 0, y: 0, width: 10, height: 3 });
            input.render(screen);

            expect(input.isDirty).toBe(false);

            input.deleteBack();
            expect(input.isDirty).toBe(true);
        });

        it('marks dirty on deleteForward at valid position', () => {
            const input = new NumberInput();

            typeText(input, '42');
            input.moveCursorHome();

            const screen = new Screen(10, 3);
            input.updateRect({ x: 0, y: 0, width: 10, height: 3 });
            input.render(screen);

            expect(input.isDirty).toBe(false);

            input.deleteForward();
            expect(input.isDirty).toBe(true);
        });

        it('marks dirty on cursor movement', () => {
            const input = new NumberInput();

            typeText(input, '42');
            const screen = new Screen(10, 3);
            input.updateRect({ x: 0, y: 0, width: 10, height: 3 });
            input.render(screen);

            expect(input.isDirty).toBe(false);

            input.moveCursorLeft();
            expect(input.isDirty).toBe(true);
        });

        it('marks dirty on increment', () => {
            const input = new NumberInput();

            const screen = new Screen(10, 3);
            input.updateRect({ x: 0, y: 0, width: 10, height: 3 });
            input.render(screen);

            expect(input.isDirty).toBe(false);

            input.increment();
            expect(input.isDirty).toBe(true);
        });

        it('marks dirty on decrement', () => {
            const input = new NumberInput();

            const screen = new Screen(10, 3);
            input.updateRect({ x: 0, y: 0, width: 10, height: 3 });
            input.render(screen);

            expect(input.isDirty).toBe(false);

            input.decrement();
            expect(input.isDirty).toBe(true);
        });

        it('marks dirty on clear', () => {
            const input = new NumberInput();

            typeText(input, '42');
            const screen = new Screen(10, 3);
            input.updateRect({ x: 0, y: 0, width: 10, height: 3 });
            input.render(screen);

            expect(input.isDirty).toBe(false);

            input.clear();
            expect(input.isDirty).toBe(true);
        });
    });

    describe('edge cases and robustness', () => {
        it('handles repeated backspace on empty input', () => {
            const input = new NumberInput();

            expect(() => {
                for (let i = 0; i < 10; i++) {
                    input.deleteBack();
                }
            }).not.toThrow();

            expect(input.rawValue).toBe('');
        });

        it('handles repeated delete on empty input', () => {
            const input = new NumberInput();

            expect(() => {
                for (let i = 0; i < 10; i++) {
                    input.deleteForward();
                }
            }).not.toThrow();

            expect(input.rawValue).toBe('');
        });

        it('handles repeated cursor movement beyond bounds', () => {
            const input = new NumberInput();

            typeText(input, '123');

            expect(() => {
                for (let i = 0; i < 20; i++) {
                    input.moveCursorLeft();
                }
                for (let i = 0; i < 20; i++) {
                    input.moveCursorRight();
                }
            }).not.toThrow();

            expect(input.rawValue).toBe('123');
        });

        it('handles repeated increment at max', () => {
            const input = new NumberInput({}, { max: 10, step: 1 });

            input.rawValue = '10';

            expect(() => {
                for (let i = 0; i < 10; i++) {
                    input.increment();
                }
            }).not.toThrow();

            expect(input.rawValue).toBe('10');
        });

        it('handles repeated decrement at min', () => {
            const input = new NumberInput({}, { min: -10, step: 1 });

            input.rawValue = '-10';

            expect(() => {
                for (let i = 0; i < 10; i++) {
                    input.decrement();
                }
            }).not.toThrow();

            expect(input.rawValue).toBe('-10');
        });

        it('handles submitting empty input without crashing', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { onSubmit });

            expect(() => input.submit()).not.toThrow();
            expect(onSubmit).toHaveBeenCalledWith(null);
        });

        it('handles very long numeric strings', () => {
            const input = new NumberInput();
            const longNumber = '1'.repeat(100);

            input.rawValue = longNumber;

            const screen = new Screen(20, 3);
            input.updateRect({ x: 0, y: 0, width: 20, height: 3 });

            expect(() => input.render(screen)).not.toThrow();
        });

        it('handles extreme decimal precision', () => {
            const input = new NumberInput();

            input.rawValue = '0.123456789012345';
            expect(input.numericValue).not.toBeNull();
        });

        it('renders safely with extremely small dimensions', () => {
            const input = new NumberInput({}, { placeholder: 'Enter' });

            input.rawValue = '999';

            expect(() => renderInput(input, 1)).not.toThrow();
        });
    });

    describe('numeric operations comprehensive', () => {
        it('increment from empty state uses step, not starting at 0', () => {
            const input = new NumberInput({}, { step: 7 });

            input.increment();
            expect(input.rawValue).toBe('7');
        });

        it('decrement from empty state uses negative step', () => {
            const input = new NumberInput({}, { step: 7, min: -100 });

            input.decrement();
            expect(input.rawValue).toBe('-7');
        });

        it('handles decimal step values precisely', () => {
            const input = new NumberInput({}, { step: 0.1, min: -10 });

            input.increment();
            input.increment();
            input.increment();

            const result = parseFloat(input.rawValue);
            expect(Math.abs(result - 0.3) < 0.0001).toBe(true);
        });

        it('handles step value of 0.01', () => {
            const input = new NumberInput({}, { step: 0.01 });

            input.increment();
            input.increment();
            input.increment();

            expect(input.rawValue).toBe('0.03');
        });

        it('works with very small step values', () => {
            const input = new NumberInput({}, { step: 0.001 });

            input.increment();

            expect(input.rawValue).toBe('0.001');
        });

        it('increments decimal values without precision loss', () => {
            const input = new NumberInput({}, { step: 0.5 });

            input.rawValue = '1.5';
            input.increment();

            expect(input.rawValue).toBe('2');
        });

        it('decrements negative values correctly', () => {
            const input = new NumberInput({}, { step: 1, min: -100 });

            input.rawValue = '-5';
            input.decrement();

            expect(input.rawValue).toBe('-6');
        });
    });

    describe('min/max clamping comprehensive', () => {
        it('clamps increment with decimal min/max', () => {
            const input = new NumberInput({}, { min: 0.1, max: 1.5, step: 0.5 });

            input.rawValue = '1.2';
            input.increment();

            expect(input.rawValue).toBe('1.5');
        });

        it('clamps decrement with negative values', () => {
            const input = new NumberInput({}, { min: -5.5, max: 0, step: 0.5 });

            input.rawValue = '-4.5';
            input.decrement();

            expect(input.rawValue).toBe('-5');
        });

        it('clamps when starting from empty above max', () => {
            const input = new NumberInput({}, { max: 2, step: 5 });

            input.increment();

            expect(input.rawValue).toBe('2');
        });

        it('clamps when starting from empty below min', () => {
            const input = new NumberInput({}, { min: -10, step: 15 });

            input.decrement();

            expect(input.rawValue).toBe('-10');
        });
    });

    describe('integration scenarios', () => {
        it('handles typing -> increment -> decrement flow', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { step: 2, onChange });

            typeText(input, '5');
            expect(onChange).toHaveBeenLastCalledWith(5);

            input.increment();
            expect(onChange).toHaveBeenLastCalledWith(7);

            input.decrement();
            input.decrement();
            expect(onChange).toHaveBeenLastCalledWith(3);
        });

        it('handles clear -> increment -> delete flow', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { step: 3, onChange });

            typeText(input, '42');
            onChange.mockClear();

            input.clear();
            expect(input.rawValue).toBe('');

            input.increment();
            expect(input.rawValue).toBe('3');

            input.deleteBack();
            expect(input.rawValue).toBe('');
        });

        it('handles submit after various operations', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { step: 1, onSubmit });

            typeText(input, '10');
            input.increment();
            input.deleteBack();

            input.submit();

            expect(onSubmit).toHaveBeenCalledWith(1);
        });

        it('onChange fires with correct values throughout complex flow', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { step: 0.5, onChange });

            input.insertChar('1');
            expect(onChange).toHaveBeenNthCalledWith(1, 1);

            input.insertChar('.');
            expect(onChange).toHaveBeenNthCalledWith(2, 1);

            input.insertChar('5');
            expect(onChange).toHaveBeenNthCalledWith(3, 1.5);

            input.increment();
            expect(onChange).toHaveBeenNthCalledWith(4, 2);

            input.deleteBack();
            expect(onChange).toHaveBeenNthCalledWith(5, null);
        });

        it('handles multiple operations without side effects', () => {
            const input = new NumberInput({}, { min: -100, max: 100, step: 5 });

            input.increment();
            input.moveCursorHome();
            input.deleteBack();
            input.insertChar('1');
            input.moveCursorEnd();
            input.insertChar('0');
            input.increment();
            input.clear();
            input.decrement();

            expect(input.rawValue).toBe('-5');
        });
    });

    describe('keyboard handling comprehensive', () => {
        it('handles all numeric digit keys', () => {
            const input = new NumberInput();

            for (let i = 0; i <= 9; i++) {
                const testInput = new NumberInput();
                testInput.handleKey(key(String(i)));
                expect(testInput.rawValue).toBe(String(i));
            }
        });

        it('handles decimal point in key event', () => {
            const input = new NumberInput();

            input.handleKey(key('.'));
            expect(input.rawValue).toContain('.');
        });

        it('handles minus sign in key event', () => {
            const input = new NumberInput({}, { min: -100 });

            input.handleKey(key('-'));
            expect(input.rawValue).toContain('-');
        });

        it('handles all navigation keys correctly', () => {
            const input = new NumberInput();

            typeText(input, '123');
            input.handleKey(key('home'));
            input.handleKey(key('right'));
            input.handleKey(key('right'));
            input.handleKey(key('left'));
            input.deleteBack();

            expect(input.rawValue).toBe('23');
        });

        it('ignores single-char keys with ctrl modifier', () => {
            const input = new NumberInput();

            input.handleKey({ ...key('1'), ctrl: true });
            expect(input.rawValue).toBe('');
        });

        it('ignores single-char keys with alt modifier', () => {
            const input = new NumberInput();

            input.handleKey({ ...key('a'), alt: true });
            expect(input.rawValue).toBe('');
        });

        it('ignores multi-char key names', () => {
            const input = new NumberInput();

            input.handleKey(key('f1'));
            input.handleKey(key('escape'));
            input.handleKey(key('pagedown'));

            expect(input.rawValue).toBe('');
        });
    });

    describe('change notification comprehensive', () => {
        it('onChange fires only on state change, not on failed insertions', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { onChange });

            input.insertChar('1');
            expect(onChange).toHaveBeenCalledTimes(1);

            input.insertChar('a');
            expect(onChange).toHaveBeenCalledTimes(1);

            input.insertChar('2');
            expect(onChange).toHaveBeenCalledTimes(2);
        });

        it('onChange fires on all cursor movements', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { onChange });

            typeText(input, '42');
            onChange.mockClear();

            input.moveCursorLeft();
            input.moveCursorRight();
            input.moveCursorHome();
            input.moveCursorEnd();

            expect(onChange).toHaveBeenCalledTimes(0);
        });

        it('onChange delivers correct numeric value for decimals', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { onChange });

            input.insertChar('3');
            input.insertChar('.');
            input.insertChar('1');
            input.insertChar('4');

            expect(onChange).toHaveBeenLastCalledWith(3.14);
        });

        it('onChange delivers null for incomplete input', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { onChange });

            input.insertChar('.');
            expect(onChange).toHaveBeenCalledWith(null);

            input.insertChar('5');
            expect(onChange).toHaveBeenCalledWith(0.5);
        });
    });

    describe('submit handling comprehensive', () => {
        it('does not require onChange to be set for onSubmit to work', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { onSubmit });

            input.rawValue = '42';
            input.submit();

            expect(onSubmit).toHaveBeenCalledWith(42);
        });

        it('submits after handleKey enter and return', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { onSubmit });

            input.rawValue = '99';
            input.handleKey(key('enter'));
            input.handleKey(key('return'));

            expect(onSubmit).toHaveBeenNthCalledWith(1, 99);
            expect(onSubmit).toHaveBeenNthCalledWith(2, 99);
        });

        it('submits invalid input as null', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { onSubmit });

            input.rawValue = '.';
            input.submit();

            expect(onSubmit).toHaveBeenCalledWith(null);
        });

        it('submits very large numbers', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { onSubmit });

            input.rawValue = '999999999999999';
            input.submit();

            expect(onSubmit).toHaveBeenCalledWith(999999999999999);
        });

        it('submits very small negative decimals', () => {
            const onSubmit = vi.fn();
            const input = new NumberInput({}, { onSubmit });

            input.rawValue = '-0.0001';
            input.submit();

            expect(onSubmit).toHaveBeenCalledWith(-0.0001);
        });
    });

    describe('clear functionality comprehensive', () => {
        it('clear resets cursor to position 0', () => {
            const input = new NumberInput();

            typeText(input, '123');
            input.moveCursorEnd();
            input.clear();

            input.insertChar('4');
            expect(input.rawValue).toBe('4');
        });

        it('clear triggers onChange with null', () => {
            const onChange = vi.fn();
            const input = new NumberInput({}, { onChange });

            typeText(input, '42');
            onChange.mockClear();

            input.clear();

            expect(onChange).toHaveBeenCalledWith(null);
        });

        it('clear can be called multiple times safely', () => {
            const input = new NumberInput();

            typeText(input, '42');

            expect(() => {
                input.clear();
                input.clear();
                input.clear();
            }).not.toThrow();

            expect(input.rawValue).toBe('');
        });
    });
});
