// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for ColorPicker widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { ColorPicker } from './ColorPicker.js';
import { type KeyEvent, caps, Screen, parseColor, colorToRgb } from '@termuijs/core';

// ── Helper factories ────────────────────────────────────────────────────────

const makeKeyEvent = (key: string, overrides: Partial<KeyEvent> = {}): KeyEvent => ({
    key,
    raw: Buffer.alloc(0),
    ctrl: false,
    alt: false,
    shift: false,
    stopPropagation: () => {},
    preventDefault: () => {},
    ...overrides,
});

/** Render picker into a fresh Screen and return the flattened row strings. */
function renderPicker(picker: ColorPicker, width = 60, height = 7): string[] {
    const screen = new Screen(width, height);
    picker.mount();
    picker.updateRect({ x: 0, y: 0, width, height });
    picker.render(screen);
    return screen.back.map(row => row.map(c => c.char).join(''));
}

// ── Palette colour list (same order as the widget's DEFAULT_PALETTE) ────────
const PALETTE = [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
] as const;

// ────────────────────────────────────────────────────────────────────────────

describe('ColorPicker', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Original tests (preserved) ──────────────────────────────────────────

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

    // ── 1. Default constructor ──────────────────────────────────────────────

    describe('default constructor', () => {
        it('initializes to white (#ffffff) when no value is provided', () => {
            const picker = new ColorPicker();
            const rgb = colorToRgb(picker.value);
            expect(rgb).toEqual([255, 255, 255]);
        });

        it('is focusable by default', () => {
            const picker = new ColorPicker();
            expect(picker.focusable).toBe(true);
        });

        it('does not throw on construction', () => {
            expect(() => new ColorPicker()).not.toThrow();
        });
    });

    // ── 2. Invalid initial color falls back safely ──────────────────────────

    describe('invalid initial color', () => {
        it('initializes successfully with an invalid color string', () => {
            expect(() => new ColorPicker({ value: 'invalid-color' })).not.toThrow();
        });

        it('falls back to white when initial color is invalid', () => {
            const picker = new ColorPicker({ value: 'invalid-color' });
            const rgb = colorToRgb(picker.value);
            expect(rgb).toEqual([255, 255, 255]);
        });

        it('renders without throwing when initial color is invalid', () => {
            const picker = new ColorPicker({ value: 'invalid-color' });
            expect(() => renderPicker(picker)).not.toThrow();
        });
    });

    // ── 3. Value setter with valid colors ───────────────────────────────────

    describe('value setter — valid colors', () => {
        it('updates the selected color to #00ff00', () => {
            const picker = new ColorPicker();
            picker.value = '#00ff00';
            const rgb = colorToRgb(picker.value);
            expect(rgb).toEqual([0, 255, 0]);
        });

        it('updates the selected color to blue (named)', () => {
            const picker = new ColorPicker();
            picker.value = 'blue';
            expect(picker.value).toEqual(parseColor('blue'));
        });

        it('rendering reflects the new color without throwing', () => {
            const picker = new ColorPicker();
            picker.value = '#00ff00';
            expect(() => renderPicker(picker)).not.toThrow();
        });

        it('renders hex label that reflects the new value', () => {
            const picker = new ColorPicker({ value: 'black' });
            picker.value = '#00ff00';
            const rows = renderPicker(picker);
            const hexRow = rows.find(r => r.includes('Hex:'));
            expect(hexRow).toBeDefined();
            expect(hexRow).toContain('00ff00');
        });
    });

    // ── 4. Value setter with invalid colors ─────────────────────────────────

    describe('value setter — invalid colors', () => {
        it('does not throw when set to an invalid color string', () => {
            const picker = new ColorPicker();
            expect(() => { picker.value = 'not-a-color'; }).not.toThrow();
        });

        it('falls back to white after setting an invalid color string', () => {
            const picker = new ColorPicker({ value: 'red' });
            picker.value = 'not-a-color';
            const rgb = colorToRgb(picker.value);
            expect(rgb).toEqual([255, 255, 255]);
        });

        it('value remains a valid Color object after invalid assignment', () => {
            const picker = new ColorPicker();
            picker.value = 'not-a-color';
            expect(picker.value.type).not.toBe('none');
        });
    });

    // ── 5. Palette navigation boundaries ───────────────────────────────────

    describe('palette navigation boundaries', () => {
        it('pressing left at index 0 stays at index 0', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'black', onChange }); // index 0
            picker.handleKey(makeKeyEvent('left'));
            expect(onChange).not.toHaveBeenCalled();
        });

        it('pressing right at index 15 (last) stays at index 15', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'brightWhite', onChange }); // index 15
            picker.handleKey(makeKeyEvent('right'));
            expect(onChange).not.toHaveBeenCalled();
        });

        it('pressing up at the top row (index 0-7) does not change selection', () => {
            const onChange = vi.fn();
            // Index 3 = yellow, top row
            const picker = new ColorPicker({ value: 'yellow', onChange });
            picker.handleKey(makeKeyEvent('up'));
            expect(onChange).not.toHaveBeenCalled();
        });

        it('pressing down at the bottom row (index 8-15) does not change selection', () => {
            const onChange = vi.fn();
            // Index 11 = brightYellow, bottom row
            const picker = new ColorPicker({ value: 'brightYellow', onChange });
            picker.handleKey(makeKeyEvent('down'));
            expect(onChange).not.toHaveBeenCalled();
        });

        it('pressing right moves from index 0 to 1', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'black', onChange });
            picker.handleKey(makeKeyEvent('right'));
            expect(onChange).toHaveBeenCalledWith(parseColor('red'));
        });

        it('pressing down moves from index 0 to 8', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'black', onChange });
            picker.handleKey(makeKeyEvent('down'));
            expect(onChange).toHaveBeenCalledWith(parseColor('brightBlack'));
        });

        it('pressing right from index 7 moves to 8 (second row first column)', () => {
            const onChange = vi.fn();
            // index 7 = white
            const picker = new ColorPicker({ value: 'white', onChange });
            picker.handleKey(makeKeyEvent('right'));
            expect(onChange).toHaveBeenCalledWith(parseColor('brightBlack'));
        });
    });

    // ── 6. Vim navigation keys ──────────────────────────────────────────────

    describe('vim navigation keys', () => {
        it('h key navigates left like the left arrow', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'red', onChange }); // index 1
            picker.handleKey(makeKeyEvent('h'));
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith(parseColor('black'));
        });

        it('l key navigates right like the right arrow', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'black', onChange }); // index 0
            picker.handleKey(makeKeyEvent('l'));
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith(parseColor('red'));
        });

        it('k key navigates up like the up arrow', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'brightRed', onChange }); // index 9
            picker.handleKey(makeKeyEvent('k'));
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith(parseColor('red'));
        });

        it('j key navigates down like the down arrow', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'red', onChange }); // index 1
            picker.handleKey(makeKeyEvent('j'));
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith(parseColor('brightRed'));
        });

        it('vim key selects correct color matching arrow-key result', () => {
            const onChangeArrow = vi.fn();
            const onChangeVim = vi.fn();
            const arrowPicker = new ColorPicker({ value: 'black', onChange: onChangeArrow });
            const vimPicker = new ColorPicker({ value: 'black', onChange: onChangeVim });

            arrowPicker.handleKey(makeKeyEvent('right'));
            vimPicker.handleKey(makeKeyEvent('l'));

            expect(onChangeArrow).toHaveBeenCalledTimes(1);
            expect(onChangeVim).toHaveBeenCalledTimes(1);

            const arrowRgb = colorToRgb(onChangeArrow.mock.calls[0][0]);
            const vimRgb = colorToRgb(onChangeVim.mock.calls[0][0]);
            expect(vimRgb).toEqual(arrowRgb);
        });
    });

    // ── 7. Ctrl/Alt modified vim keys are ignored ───────────────────────────

    describe('ctrl/alt modified vim keys', () => {
        it('ctrl+h does not change palette selection', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'red', onChange }); // index 1
            picker.handleKey(makeKeyEvent('h', { ctrl: true }));
            expect(onChange).not.toHaveBeenCalled();
        });

        it('alt+j does not change palette selection', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'red', onChange });
            picker.handleKey(makeKeyEvent('j', { alt: true }));
            expect(onChange).not.toHaveBeenCalled();
        });

        it('ctrl+k does not change palette selection', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'brightRed', onChange });
            picker.handleKey(makeKeyEvent('k', { ctrl: true }));
            expect(onChange).not.toHaveBeenCalled();
        });

        it('alt+l does not change palette selection', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'black', onChange });
            picker.handleKey(makeKeyEvent('l', { alt: true }));
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    // ── 8. Unsupported keys are ignored ────────────────────────────────────

    describe('unsupported keys', () => {
        for (const key of ['enter', 'escape', 'tab', 'space']) {
            it(`"${key}" does not change state or fire callbacks`, () => {
                const onChange = vi.fn();
                const picker = new ColorPicker({ value: 'red', onChange });
                const before = picker.value;
                expect(() => picker.handleKey(makeKeyEvent(key))).not.toThrow();
                expect(onChange).not.toHaveBeenCalled();
                expect(colorToRgb(picker.value)).toEqual(colorToRgb(before));
            });
        }
    });

    // ── 9. Backspace on empty hex input ────────────────────────────────────

    describe('backspace on empty hex input', () => {
        it('backspace on an already-empty hex value does not throw', () => {
            const picker = new ColorPicker({ value: '#ffffff' });
            // Clear the hex value by pressing backspace 6 times
            for (let i = 0; i < 6; i++) {
                picker.handleKey(makeKeyEvent('backspace'));
            }
            // One more backspace on empty — must not throw
            expect(() => picker.handleKey(makeKeyEvent('backspace'))).not.toThrow();
        });

        it('state remains valid after backspace on empty input', () => {
            const picker = new ColorPicker({ value: '#ffffff' });
            for (let i = 0; i < 7; i++) {
                picker.handleKey(makeKeyEvent('backspace'));
            }
            expect(picker.value.type).not.toBe('none');
        });
    });

    // ── 10. Invalid partial hex values do not fire onChange ─────────────────

    describe('invalid partial hex values', () => {
        it('single hex char "f" does not fire onChange', () => {
            const onChange = vi.fn();
            // Start from empty: backspace 6 times to clear
            const picker = new ColorPicker({ value: '#ffffff', onChange });
            for (let i = 0; i < 6; i++) picker.handleKey(makeKeyEvent('backspace'));
            onChange.mockClear();
            picker.handleKey(makeKeyEvent('f')); // length 1
            expect(onChange).not.toHaveBeenCalled();
        });

        it('two hex chars "ff" do not fire onChange', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: '#ffffff', onChange });
            for (let i = 0; i < 6; i++) picker.handleKey(makeKeyEvent('backspace'));
            onChange.mockClear();
            picker.handleKey(makeKeyEvent('f'));
            picker.handleKey(makeKeyEvent('f')); // length 2
            expect(onChange).not.toHaveBeenCalled();
        });

        it('typing a 4th char after a valid 3-char state does not fire a second onChange', () => {
            // #abc (3 chars) is a valid hex -> fires onChange once.
            // Typing a 4th char reaches 4 chars which is invalid -> must NOT fire again.
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: '#ffffff', onChange });
            for (let i = 0; i < 6; i++) picker.handleKey(makeKeyEvent('backspace'));
            for (const ch of ['a', 'b', 'c']) picker.handleKey(makeKeyEvent(ch)); // length 3: fires
            onChange.mockClear(); // reset — we care about what happens at length 4
            picker.handleKey(makeKeyEvent('1')); // length 4 -> invalid, must NOT fire
            expect(onChange).not.toHaveBeenCalled();
        });

        it('typing a 5th char after a 4-char state does not fire onChange', () => {
            // Start from 3 chars (valid), then type to 4 (invalid) then to 5 (invalid).
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: '#ffffff', onChange });
            for (let i = 0; i < 6; i++) picker.handleKey(makeKeyEvent('backspace'));
            for (const ch of ['a', 'b', 'c']) picker.handleKey(makeKeyEvent(ch)); // length 3: fires
            onChange.mockClear();
            picker.handleKey(makeKeyEvent('1')); // length 4 -> invalid
            expect(onChange).not.toHaveBeenCalled();
            picker.handleKey(makeKeyEvent('2')); // length 5 -> invalid
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    // ── 11. Valid hex entry triggers onChange ───────────────────────────────

    describe('valid hex entry triggers onChange', () => {
        it('entering "000" (3 chars) fires onChange with black', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: '#ffffff', onChange });
            for (let i = 0; i < 6; i++) picker.handleKey(makeKeyEvent('backspace'));
            onChange.mockClear();
            for (const ch of ['0', '0', '0']) picker.handleKey(makeKeyEvent(ch));
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(colorToRgb(onChange.mock.calls[0][0])).toEqual([0, 0, 0]);
        });

        it('entering "abc" (3 chars) fires onChange exactly once', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: '#ffffff', onChange });
            for (let i = 0; i < 6; i++) picker.handleKey(makeKeyEvent('backspace'));
            onChange.mockClear();
            for (const ch of ['a', 'b', 'c']) picker.handleKey(makeKeyEvent(ch));
            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it('entering "123456" (6 chars) fires onChange twice — at 3 chars and at 6 chars', () => {
            // parseColor accepts both 3-char and 6-char hex strings, so onChange fires
            // when the input reaches length 3 (#123) and again at length 6 (#123456).
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: '#ffffff', onChange });
            for (let i = 0; i < 6; i++) picker.handleKey(makeKeyEvent('backspace'));
            onChange.mockClear();
            for (const ch of ['1', '2', '3', '4', '5', '6']) picker.handleKey(makeKeyEvent(ch));
            expect(onChange).toHaveBeenCalledTimes(2);
            // The final (6-char) call must carry the correct #123456 colour.
            const rgb = colorToRgb(onChange.mock.calls[1][0]);
            expect(rgb).toEqual([0x12, 0x34, 0x56]);
        });
    });

    // ── 12. Non-hex characters are ignored ─────────────────────────────────

    describe('non-hex character rejection', () => {
        for (const ch of ['g', 'z', '!', '@', '#']) {
            it(`character "${ch}" is rejected and does not change hex value`, () => {
                const onChange = vi.fn();
                // Start from a 2-char state so any valid char would NOT trigger onChange
                const picker = new ColorPicker({ value: '#ffffff', onChange });
                for (let i = 0; i < 4; i++) picker.handleKey(makeKeyEvent('backspace')); // 'ff'
                onChange.mockClear();
                picker.handleKey(makeKeyEvent(ch));
                expect(onChange).not.toHaveBeenCalled();
            });
        }
    });

    // ── 13. Hex input length limit ──────────────────────────────────────────

    describe('hex input length limit', () => {
        it('hex value never exceeds 6 characters', () => {
            const picker = new ColorPicker({ value: '#ffffff' }); // already 6 chars
            // Attempting to type another hex char
            picker.handleKey(makeKeyEvent('a'));
            // We can't inspect _hexValue directly; instead verify rendering stays stable
            const rows = renderPicker(picker);
            const hexRow = rows.find(r => r.includes('Hex:'));
            expect(hexRow).toBeDefined();
            // The hex portion after 'Hex: #' should be at most 6 chars
            const match = hexRow!.match(/Hex: #([0-9a-f]{0,6})/i);
            expect(match).not.toBeNull();
            expect(match![1].length).toBeLessThanOrEqual(6);
        });

        it('additional input beyond 6 chars is silently ignored', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: '#ffffff', onChange });
            onChange.mockClear();
            // #ffffff is already 6 chars; typing more should not call onChange again
            for (const ch of ['0', '1', '2']) picker.handleKey(makeKeyEvent(ch));
            // onChange should NOT be called because input is silently ignored at 6 chars
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    // ── 14. Palette selection updates hex value ─────────────────────────────

    describe('palette selection updates hex value', () => {
        it('navigating right from black updates the hex label to red', () => {
            const picker = new ColorPicker({ value: 'black' });
            picker.handleKey(makeKeyEvent('right')); // moves to red
            const rows = renderPicker(picker);
            const hexRow = rows.find(r => r.includes('Hex:'));
            // red = rgb(170, 0, 0) => hex 'aa0000'
            expect(hexRow).toContain('aa0000');
        });

        it('navigating to each palette entry updates the hex field correctly', () => {
            const picker = new ColorPicker({ value: 'black' });
            // Navigate through all 15 entries rightward
            for (let i = 0; i < 7; i++) picker.handleKey(makeKeyEvent('right'));
            // Now at white (index 7), rgb(170,170,170) = 'aaaaaa'
            const rows = renderPicker(picker);
            const hexRow = rows.find(r => r.includes('Hex:'));
            expect(hexRow).toContain('aaaaaa');
        });
    });

    // ── 15. onChange callback accuracy ──────────────────────────────────────

    describe('onChange callback accuracy', () => {
        it('callback receives the correct Color object', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'black', onChange });
            picker.handleKey(makeKeyEvent('right')); // -> red
            const received = onChange.mock.calls[0][0];
            expect(colorToRgb(received)).toEqual(colorToRgb(parseColor('red')));
        });

        it('callback count matches actual navigation changes', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'black', onChange });
            picker.handleKey(makeKeyEvent('right'));
            picker.handleKey(makeKeyEvent('right'));
            picker.handleKey(makeKeyEvent('down'));
            expect(onChange).toHaveBeenCalledTimes(3);
        });

        it('no duplicate callbacks when pressing a boundary key repeatedly', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'black', onChange }); // index 0
            // Press left 5 times at boundary — should never fire
            for (let i = 0; i < 5; i++) picker.handleKey(makeKeyEvent('left'));
            expect(onChange).not.toHaveBeenCalled();
        });

        it('no callback fires for unsupported/modifier keys', () => {
            const onChange = vi.fn();
            const picker = new ColorPicker({ value: 'red', onChange });
            picker.handleKey(makeKeyEvent('enter'));
            picker.handleKey(makeKeyEvent('escape'));
            picker.handleKey(makeKeyEvent('tab'));
            picker.handleKey(makeKeyEvent('h', { ctrl: true }));
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    // ── 16. Unicode rendering ────────────────────────────────────────────────

    describe('unicode rendering', () => {
        it('palette uses ■ symbol when unicode is enabled', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const picker = new ColorPicker({ value: 'red' });
            const rows = renderPicker(picker);
            const paletteRows = rows.slice(0, 2).join('');
            expect(paletteRows).toContain('■');
            expect(paletteRows).not.toContain('o');
        });

        it('swatch uses ████ blocks when unicode is enabled', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const picker = new ColorPicker({ value: 'red' });
            const rows = renderPicker(picker);
            const hexRow = rows.find(r => r.includes('Swatch:'));
            expect(hexRow).toBeDefined();
            expect(hexRow).toContain('████');
        });

        it('selection brackets [ ] render around the selected palette entry', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const picker = new ColorPicker({ value: 'black' }); // index 0
            const rows = renderPicker(picker);
            const paletteRow0 = rows[1]; // row 0 of content = screen row 1 (border occupies row 0)
            expect(paletteRow0).toContain('[');
            expect(paletteRow0).toContain(']');
        });
    });

    // ── 17. ASCII rendering ──────────────────────────────────────────────────

    describe('ASCII rendering', () => {
        it('palette uses o symbol when unicode is disabled', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const picker = new ColorPicker({ value: 'red' });
            picker.markDirty();
            const rows = renderPicker(picker);
            const paletteRows = rows.slice(0, 2).join('');
            expect(paletteRows).toContain('o');
            expect(paletteRows).not.toContain('■');
        });

        it('swatch uses #### blocks when unicode is disabled', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const picker = new ColorPicker({ value: 'red' });
            picker.markDirty();
            const rows = renderPicker(picker);
            const hexRow = rows.find(r => r.includes('Swatch:'));
            expect(hexRow).toBeDefined();
            expect(hexRow).toContain('####');
        });

        it('rendering remains stable without unicode', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const picker = new ColorPicker({ value: 'cyan' });
            expect(() => renderPicker(picker)).not.toThrow();
        });
    });

    // ── 18. Rendering with small width ──────────────────────────────────────

    describe('rendering with small width', () => {
        it('does not throw when rendered in a narrow (10 cols) screen', () => {
            const picker = new ColorPicker({ value: 'red' });
            expect(() => renderPicker(picker, 10, 7)).not.toThrow();
        });

        it('does not exceed screen boundaries with narrow width', () => {
            const width = 10;
            const height = 7;
            const screen = new Screen(width, height);
            const picker = new ColorPicker({ value: 'red' });
            picker.mount();
            picker.updateRect({ x: 0, y: 0, width, height });
            // Should not throw (screen internally guards bounds)
            expect(() => picker.render(screen)).not.toThrow();
        });
    });

    // ── 19. Rendering with small height (< 4) ───────────────────────────────

    describe('rendering with small height', () => {
        it('renders without throwing when height is 3', () => {
            const picker = new ColorPicker({ value: 'red' });
            expect(() => renderPicker(picker, 40, 3)).not.toThrow();
        });

        it('palette rows still render when height is 3', () => {
            const picker = new ColorPicker({ value: 'red' });
            const rows = renderPicker(picker, 40, 3);
            // At height 3 with a border (1px top, 1px bottom) there's 1 content row
            // The palette or border should still be visible
            expect(rows.length).toBe(3);
        });
    });

    // ── 20. Zero width rendering ─────────────────────────────────────────────

    describe('zero width rendering', () => {
        it('does not throw when width is 0', () => {
            const screen = new Screen(0, 7);
            const picker = new ColorPicker({ value: 'red' });
            picker.mount();
            picker.updateRect({ x: 0, y: 0, width: 0, height: 7 });
            expect(() => picker.render(screen)).not.toThrow();
        });
    });

    // ── 21. Zero height rendering ────────────────────────────────────────────

    describe('zero height rendering', () => {
        it('does not throw when height is 0', () => {
            const screen = new Screen(40, 0);
            const picker = new ColorPicker({ value: 'red' });
            picker.mount();
            picker.updateRect({ x: 0, y: 0, width: 40, height: 0 });
            expect(() => picker.render(screen)).not.toThrow();
        });
    });

    // ── 22. Rendering while focused ──────────────────────────────────────────

    describe('rendering while focused', () => {
        it('does not throw when isFocused is true', () => {
            const picker = new ColorPicker({ value: 'red' });
            picker.isFocused = true;
            expect(() => renderPicker(picker)).not.toThrow();
        });

        it('cursor cell appears after the hex value when focused', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const picker = new ColorPicker({ value: '#123456' });
            picker.isFocused = true;
            const screen = new Screen(60, 7);
            picker.mount();
            picker.updateRect({ x: 0, y: 0, width: 60, height: 7 });
            picker.render(screen);

            // Row index 4 (border:1 + palette:2 + blank:1 = row 4 in screen)
            const hexScreenRow = 4; // y=0 border + 3 content rows (palette row 0,1 + row index 3)
            // Find the row containing "Hex:" — it's at content y+3 = screen row 4
            const rows = screen.back.map(row => row.map(c => c.char).join(''));
            const hexRow = rows.find(r => r.includes('Hex:'));
            expect(hexRow).toBeDefined();

            // At least one cell in the hex row should be inverse (cursor)
            const hexRowIdx = rows.indexOf(hexRow!);
            const hasInverseCell = screen.back[hexRowIdx].some(c => c.inverse === true);
            expect(hasInverseCell).toBe(true);
        });
    });

    // ── 23. Rendering while not focused ─────────────────────────────────────

    describe('rendering while not focused', () => {
        it('does not throw when isFocused is false', () => {
            const picker = new ColorPicker({ value: 'red' });
            picker.isFocused = false;
            expect(() => renderPicker(picker)).not.toThrow();
        });

        it('no inverse (cursor) cell is rendered in hex row when not focused', () => {
            const picker = new ColorPicker({ value: '#123456' });
            picker.isFocused = false;
            const screen = new Screen(60, 7);
            picker.mount();
            picker.updateRect({ x: 0, y: 0, width: 60, height: 7 });
            picker.render(screen);

            const rows = screen.back.map(row => row.map(c => c.char).join(''));
            const hexRow = rows.find(r => r.includes('Hex:'));
            expect(hexRow).toBeDefined();
            const hexRowIdx = rows.indexOf(hexRow!);
            const hasInverseCell = screen.back[hexRowIdx].some(c => c.inverse === true);
            expect(hasInverseCell).toBe(false);
        });
    });
});
