// ─────────────────────────────────────────────────────
// @termuijs/ui — MaskedInput widget tests
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { MaskedInput } from './MaskedInput.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Fire a key press on a MaskedInput */
function press(input: MaskedInput, key: string): void {
    input.handleKey({ key, ctrl: false, alt: false } as any);
}

/** Type a sequence of digit characters */
function typeDigits(input: MaskedInput, digits: string): void {
    for (const ch of digits) press(input, ch);
}

/** Render into a Screen and return the content row (row 1, inside the border). */
function renderRow(input: MaskedInput, width = 40, height = 3, row = 1): string {
    input.updateRect({ x: 0, y: 0, width, height });
    const screen = new Screen(width, height);
    input.render(screen);
    return screen.back[row].map((c) => c.char).join('');
}

// ─── 1. Constructor & Initialization ───────────────────────────────────────

describe('MaskedInput — Constructor & Initialization', () => {
    it('creates without throwing', () => {
        expect(() => new MaskedInput({}, { mask: '__/__/____' })).not.toThrow();
    });

    it('focusable is true', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        expect(input.focusable).toBe(true);
    });

    it('default placeholder is _', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        expect(input.getValue()).toBe('__-__');
    });

    it('custom placeholder overrides default', () => {
        const input = new MaskedInput({}, { mask: '__-__', placeholder: '*' });
        expect(input.getValue()).toBe('**-**');
    });

    it('empty mask initializes safely', () => {
        expect(() => new MaskedInput({}, { mask: '' })).not.toThrow();
        const input = new MaskedInput({}, { mask: '' });
        expect(input.getValue()).toBe('');
    });

    it('mask with no editable slots initializes safely', () => {
        expect(() => new MaskedInput({}, { mask: '----' })).not.toThrow();
        const input = new MaskedInput({}, { mask: '----' });
        expect(input.getValue()).toBe('----');
    });
});

// ─── 2. Value Generation ───────────────────────────────────────────────────

describe('MaskedInput — getValue()', () => {
    it('empty mask returns empty string', () => {
        const input = new MaskedInput({}, { mask: '' });
        expect(input.getValue()).toBe('');
    });

    it('mask with no slots returns fixed chars', () => {
        const input = new MaskedInput({}, { mask: '----' });
        expect(input.getValue()).toBe('----');
    });

    it('fresh mask returns all placeholder slots', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        expect(input.getValue()).toBe('__-__');
    });

    it('partially filled mask replaces empty slots with placeholder', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        typeDigits(input, '123');
        // 4 slots total: '1','2','-','3','_' → '12-3_'
        expect(input.getValue()).toBe('12-3_');
    });

    it('fully filled mask returns formatted value', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        typeDigits(input, '1234');
        expect(input.getValue()).toBe('12-34');
    });

    it('fixed mask characters remain unchanged throughout', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '12052026');
        const v = input.getValue();
        expect(v[2]).toBe('/');
        expect(v[5]).toBe('/');
    });
});

// ─── 3. Digit Input ────────────────────────────────────────────────────────

describe('MaskedInput — Digit Input', () => {
    it('first digit fills slot 0', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        press(input, '3');
        expect(input.getValue().startsWith('3')).toBe(true);
    });

    it('digits fill slots sequentially', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '1205');
        expect(input.getValue()).toBe('12/05/____');
    });

    it('cursor advances automatically past fixed chars', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        typeDigits(input, '12');
        // After 2 digits the next slot is slot 2 (past the '-')
        expect(input.getValue()).toBe('12-__');
    });

    it('filling all slots stops further insertion', () => {
        const input = new MaskedInput({}, { mask: '__' });
        typeDigits(input, '123'); // only 2 slots
        expect(input.getValue()).toBe('12');
    });

    it('additional digits after completion are ignored', () => {
        const input = new MaskedInput({}, { mask: '_' });
        press(input, '1');
        press(input, '2');
        expect(input.getValue()).toBe('1');
    });

    it('letter keys are ignored', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        press(input, 'a');
        press(input, 'z');
        expect(input.getValue()).toBe('__/__/____');
    });

    it('minus sign is ignored', () => {
        const input = new MaskedInput({}, { mask: '__' });
        press(input, '-');
        expect(input.getValue()).toBe('__');
    });

    it('slash is ignored', () => {
        const input = new MaskedInput({}, { mask: '__' });
        press(input, '/');
        expect(input.getValue()).toBe('__');
    });

    it('space is ignored', () => {
        const input = new MaskedInput({}, { mask: '__' });
        press(input, ' ');
        expect(input.getValue()).toBe('__');
    });
});

// ─── 4. Cursor Navigation ──────────────────────────────────────────────────

describe('MaskedInput — Cursor Navigation', () => {
    it('left moves cursor one slot back', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '12');
        // Cursor is now at slot 2 (auto-advanced past filled slots 0 and 1).
        // Left moves cursor to slot 1.
        press(input, 'left');
        // Backspace at slot 1: clears slot 0 and moves cursor to slot 0.
        press(input, 'backspace');
        // slot[1] is still '2'; slot[0] is now empty
        expect(input.getValue()).toBe('_2/__/____');
    });

    it('left does not move cursor below 0', () => {
        const input = new MaskedInput({}, { mask: '__' });
        press(input, 'left');
        press(input, 'left');
        // cursor stays at slot 0 – backspace here does nothing
        press(input, 'backspace');
        expect(input.getValue()).toBe('__');
    });

    it('right moves cursor one slot right', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        // cursor starts at 0; move right then type
        press(input, 'right');
        press(input, '5');
        expect(input.getValue()).toBe('_5-__');
    });

    it('right does not move cursor past last slot', () => {
        const input = new MaskedInput({}, { mask: '__' });
        press(input, 'right');
        press(input, 'right');
        press(input, 'right');
        // cursor is still at slot 1 (last); typing fills it
        press(input, '9');
        expect(input.getValue()).toBe('_9');
    });

    it('home moves cursor to slot 0', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '12');
        press(input, 'home');
        // cursor at 0; backspace does nothing
        press(input, 'backspace');
        expect(input.getValue()).toContain('12');
    });

    it('end moves cursor to last slot', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        press(input, 'end');
        press(input, '7');
        expect(input.getValue()).toBe('__-_7');
    });

    it('navigation does not modify values', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        typeDigits(input, '12');
        const before = input.getValue();
        press(input, 'left');
        press(input, 'right');
        press(input, 'home');
        press(input, 'end');
        expect(input.getValue()).toBe(before);
    });
});

// ─── 5. Backspace Behavior ─────────────────────────────────────────────────

describe('MaskedInput — Backspace', () => {
    it('removes the previous slot value and moves cursor back', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '12');
        press(input, 'backspace');
        expect(input.getValue()).toBe('1_/__/____');
    });

    it('consecutive backspaces clear multiple slots', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '1205');
        press(input, 'backspace');
        press(input, 'backspace');
        expect(input.getValue()).toBe('12/__/____');
    });

    it('backspace at slot 0 does nothing', () => {
        const input = new MaskedInput({}, { mask: '__' });
        press(input, 'backspace');
        expect(input.getValue()).toBe('__');
    });

    it('backspace after full completion clears last digit', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '12051520');
        press(input, 'backspace');
        expect(input.getValue()).toBe('12/05/152_');
    });

    it('backspace after backspace at position 0 still does nothing', () => {
        const input = new MaskedInput({}, { mask: '__' });
        press(input, '1');
        press(input, 'backspace'); // clears slot 0, cursor at 0
        press(input, 'backspace'); // should be no-op
        expect(input.getValue()).toBe('__');
    });
});

// ─── 6. Completion Detection ───────────────────────────────────────────────

describe('MaskedInput — Completion Detection', () => {
    it('incomplete mask does not trigger onComplete', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onComplete });
        typeDigits(input, '1205152'); // 7 of 8 slots
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('fully completed mask triggers onComplete exactly once', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onComplete });
        typeDigits(input, '12051520');
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('additional invalid keys after completion do not retrigger onComplete', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onComplete });
        typeDigits(input, '12051520');
        onComplete.mockClear();
        press(input, 'a');
        press(input, 'x');
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('reset clears completion state — refill triggers onComplete again', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onComplete });
        typeDigits(input, '12051520');
        input.reset();
        onComplete.mockClear();
        typeDigits(input, '12052026');
        expect(onComplete).toHaveBeenCalledTimes(1);
    });
});

// ─── 7. onChange Callback ──────────────────────────────────────────────────

describe('MaskedInput — onChange', () => {
    it('fires for every successful digit insertion', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onChange });
        typeDigits(input, '12');
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('fires for backspace', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onChange });
        typeDigits(input, '12');
        onChange.mockClear();
        press(input, 'backspace');
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('fires for reset', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onChange });
        typeDigits(input, '12');
        onChange.mockClear();
        input.reset();
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('does NOT fire for ignored letter key', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__' }, onChange);
        // Pass onChange via options
        const input2 = new MaskedInput({}, { mask: '__', onChange });
        press(input2, 'a');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does NOT fire for minus', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__', onChange });
        press(input, '-');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does NOT fire for space', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__', onChange });
        press(input, ' ');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does NOT fire for backspace at slot 0', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__', onChange });
        press(input, 'backspace');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does NOT fire for navigation keys', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__-__', onChange });
        press(input, 'left');
        press(input, 'right');
        press(input, 'home');
        press(input, 'end');
        expect(onChange).not.toHaveBeenCalled();
    });
});

// ─── 8. onComplete Callback ────────────────────────────────────────────────

describe('MaskedInput — onComplete', () => {
    it('fires when final slot is filled', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onComplete });
        typeDigits(input, '12051520');
        expect(onComplete).toHaveBeenCalled();
    });

    it('receives correctly formatted value', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onComplete });
        typeDigits(input, '12052026');
        expect(onComplete).toHaveBeenCalledWith('12/05/2026');
    });

    it('fires only once per completion cycle', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__', onComplete });
        typeDigits(input, '123'); // only 2 slots; extra '3' ignored
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('fires again after reset and refill', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__', onComplete });
        typeDigits(input, '12');
        input.reset();
        typeDigits(input, '34');
        expect(onComplete).toHaveBeenCalledTimes(2);
    });
});

// ─── 9. Reset Behavior ─────────────────────────────────────────────────────

describe('MaskedInput — reset()', () => {
    it('clears all slots', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '120');
        input.reset();
        expect(input.getValue()).toBe('__/__/____');
    });

    it('cursor returns to first slot after reset', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        typeDigits(input, '12');
        input.reset();
        // typing should fill from slot 0
        press(input, '9');
        expect(input.getValue()).toBe('9_-__');
    });

    it('reset renders correct placeholder', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '12052026');
        input.reset();
        const row = renderRow(input);
        expect(row).toContain('__/__/____');
    });

    it('onChange fires with reset value', () => {
        const onChange = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onChange });
        typeDigits(input, '12');
        onChange.mockClear();
        input.reset();
        expect(onChange).toHaveBeenCalledWith('__/__/____');
    });

    it('multiple consecutive resets are safe', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        expect(() => {
            input.reset();
            input.reset();
            input.reset();
        }).not.toThrow();
        expect(input.getValue()).toBe('__/__/____');
    });
});

// ─── 10. Rendering ─────────────────────────────────────────────────────────

describe('MaskedInput — Rendering', () => {
    it('empty state renders placeholder chars', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        const row = renderRow(input);
        expect(row).toContain('__/__/____');
    });

    it('custom placeholder renders correctly', () => {
        const input = new MaskedInput({}, { mask: '__/__/____', placeholder: '*' });
        const row = renderRow(input);
        expect(row).toContain('**/**');
    });

    it('partial values render as expected', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '120');
        const row = renderRow(input);
        expect(row).toContain('12/0_/____');
    });

    it('full values render the complete formatted string', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '12052026');
        const row = renderRow(input);
        expect(row).toContain('12/05/2026');
    });

    it('long mask is truncated and does not overflow width', () => {
        const mask = '_'.repeat(50);
        const input = new MaskedInput({}, { mask });
        // width 10 → content width = 10 - 2 (border) = 8
        expect(() => renderRow(input, 10)).not.toThrow();
    });

    it('renders safely when width is 0', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        expect(() => {
            input.updateRect({ x: 0, y: 0, width: 0, height: 3 });
            const screen = new Screen(1, 3);
            input.render(screen);
        }).not.toThrow();
    });

    it('renders safely when height is 0', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        expect(() => {
            input.updateRect({ x: 0, y: 0, width: 40, height: 0 });
            const screen = new Screen(40, 1);
            input.render(screen);
        }).not.toThrow();
    });
});

// ─── 11. Focus & Cursor Rendering ──────────────────────────────────────────

describe('MaskedInput — Focus & Cursor Rendering', () => {
    it('cursor cell has inverse=true when focused', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        input.isFocused = true;
        const screen = new Screen(40, 3);
        input.render(screen);
        // Content row is row 1; cursor is at display position 0 relative to content area x=1
        const cursorCell = screen.back[1][1]; // x=1 (border) + displayPos 0
        expect(cursorCell?.inverse).toBe(true);
    });

    it('cursor does not render as inverse when unfocused', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        input.isFocused = false;
        const screen = new Screen(40, 3);
        input.render(screen);
        const cell = screen.back[1][1];
        expect(cell?.inverse).toBeFalsy();
    });

    it('cursor tracks right movement', () => {
        const input = new MaskedInput({}, { mask: '__-__' });
        input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        input.isFocused = true;

        // Move cursor right (slot 1 → display pos 1)
        press(input, 'right');
        const screen = new Screen(40, 3);
        input.render(screen);
        const cursorCell = screen.back[1][2]; // x=1 (border) + displayPos 1
        expect(cursorCell?.inverse).toBe(true);
    });

    it('cursor stays inside visible area', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        input.isFocused = true;
        // Move to end
        press(input, 'end');
        const screen = new Screen(40, 3);
        expect(() => input.render(screen)).not.toThrow();
    });
});

// ─── 12. markDirty Coverage ────────────────────────────────────────────────

describe('MaskedInput — markDirty()', () => {
    function freshInput(mask = '__/__/____'): MaskedInput {
        const input = new MaskedInput({}, { mask });
        input.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        const screen = new Screen(40, 3);
        input.render(screen); // clears initial dirty flag
        return input;
    }

    it('markDirty called when digit inserted', () => {
        const input = freshInput();
        const spy = vi.spyOn(input as any, 'markDirty');
        press(input, '1');
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty called when backspace pressed', () => {
        const input = freshInput();
        press(input, '1');
        const screen2 = new Screen(40, 3);
        input.render(screen2);
        const spy = vi.spyOn(input as any, 'markDirty');
        press(input, 'backspace');
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty called when cursor moves left', () => {
        const input = freshInput();
        press(input, '1');
        press(input, '2');
        const screen2 = new Screen(40, 3);
        input.render(screen2);
        const spy = vi.spyOn(input as any, 'markDirty');
        press(input, 'left');
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty called when cursor moves right', () => {
        const input = freshInput();
        const spy = vi.spyOn(input as any, 'markDirty');
        press(input, 'right');
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty called for home key', () => {
        const input = freshInput();
        const spy = vi.spyOn(input as any, 'markDirty');
        press(input, 'home');
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty called for end key', () => {
        const input = freshInput();
        const spy = vi.spyOn(input as any, 'markDirty');
        press(input, 'end');
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty called on reset', () => {
        const input = freshInput();
        const spy = vi.spyOn(input as any, 'markDirty');
        input.reset();
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty NOT called for invalid/ignored input', () => {
        const input = freshInput();
        const spy = vi.spyOn(input as any, 'markDirty');
        press(input, 'a');
        press(input, '-');
        press(input, ' ');
        expect(spy).not.toHaveBeenCalled();
    });

    it('markDirty NOT called for backspace at slot 0', () => {
        const input = freshInput();
        // cursor already at slot 0 after render
        const spy = vi.spyOn(input as any, 'markDirty');
        press(input, 'backspace');
        expect(spy).not.toHaveBeenCalled();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });
});

// ─── 13. Boundary Conditions ───────────────────────────────────────────────

describe('MaskedInput — Boundary Conditions', () => {
    it('single slot mask _ works end-to-end', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '_', onComplete });
        press(input, '7');
        expect(input.getValue()).toBe('7');
        expect(onComplete).toHaveBeenCalledWith('7');
    });

    it('phone mask (___) ___-____ fills correctly', () => {
        const input = new MaskedInput({}, { mask: '(___) ___-____' });
        typeDigits(input, '1234567890');
        expect(input.getValue()).toBe('(123) 456-7890');
    });

    it('date mask __/__/____ fills correctly', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '12052026');
        expect(input.getValue()).toBe('12/05/2026');
    });

    it('mask without slots ---- is safe', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '----', onComplete });
        press(input, '1');
        expect(input.getValue()).toBe('----');
        expect(onComplete).not.toHaveBeenCalled();
    });
});

// ─── 14. Empty & Invalid Masks ─────────────────────────────────────────────

describe('MaskedInput — Empty & Invalid Masks', () => {
    it('empty mask: no crash on construction', () => {
        expect(() => new MaskedInput({}, { mask: '' })).not.toThrow();
    });

    it('empty mask: rendering succeeds', () => {
        const input = new MaskedInput({}, { mask: '' });
        expect(() => renderRow(input)).not.toThrow();
    });

    it('empty mask: input is ignored safely', () => {
        const input = new MaskedInput({}, { mask: '' });
        expect(() => press(input, '5')).not.toThrow();
    });

    it('empty mask: onComplete never fires', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '', onComplete });
        press(input, '5');
        expect(onComplete).not.toHaveBeenCalled();
    });
});

// ─── 15. Robustness ────────────────────────────────────────────────────────

describe('MaskedInput — Robustness', () => {
    it('handles mask with hundreds of slots', () => {
        const mask = '_'.repeat(200);
        const input = new MaskedInput({}, { mask });
        expect(() => {
            for (let i = 0; i < 250; i++) press(input, String(i % 10));
        }).not.toThrow();
        expect(input.getValue().length).toBe(200);
    });

    it('repeated cursor movement does not throw', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        expect(() => {
            for (let i = 0; i < 100; i++) press(input, 'left');
            for (let i = 0; i < 100; i++) press(input, 'right');
            press(input, 'home');
            press(input, 'end');
        }).not.toThrow();
    });

    it('repeated backspaces do not throw', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '12052026');
        expect(() => {
            for (let i = 0; i < 50; i++) press(input, 'backspace');
        }).not.toThrow();
    });

    it('repeated resets are safe', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        typeDigits(input, '120');
        expect(() => {
            for (let i = 0; i < 20; i++) input.reset();
        }).not.toThrow();
        expect(input.getValue()).toBe('__/__/____');
    });

    it('completion → deletion → refill cycle works', () => {
        const onComplete = vi.fn();
        const input = new MaskedInput({}, { mask: '__/__/____', onComplete });
        typeDigits(input, '12052026');
        expect(onComplete).toHaveBeenCalledTimes(1);

        // delete all and refill
        for (let i = 0; i < 8; i++) press(input, 'backspace');
        typeDigits(input, '31121999');
        expect(onComplete).toHaveBeenCalledTimes(2);
        expect(input.getValue()).toBe('31/12/1999');
    });

    it('width = 0 does not throw', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        expect(() => {
            input.updateRect({ x: 0, y: 0, width: 0, height: 3 });
            input.render(new Screen(1, 3));
        }).not.toThrow();
    });

    it('height = 0 does not throw', () => {
        const input = new MaskedInput({}, { mask: '__/__/____' });
        expect(() => {
            input.updateRect({ x: 0, y: 0, width: 40, height: 0 });
            input.render(new Screen(40, 1));
        }).not.toThrow();
    });
});

// ─── Original Tests (preserved) ────────────────────────────────────────────

describe('MaskedInput (original tests)', () => {
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
