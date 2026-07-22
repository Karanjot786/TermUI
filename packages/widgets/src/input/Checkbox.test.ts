// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Checkbox widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Checkbox } from './Checkbox.js';
import { Screen, caps } from '@termuijs/core';
import type { KeyEvent } from '@termuijs/core';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
});

/** Helper: build a typed KeyEvent for keyboard tests. */
function makeKeyEvent(key: string): KeyEvent {
    return { key, ctrl: false, alt: false, shift: false } as KeyEvent;
}

/** Helper: create widget, set rect, render to a screen, return both. */
function renderCheckbox(
    label: string,
    opts: ConstructorParameters<typeof Checkbox>[2] = {},
    style: ConstructorParameters<typeof Checkbox>[1] = {},
    width = 30,
    height = 1,
) {
    const checkbox = new Checkbox(label, style, opts);
    const screen = new Screen(width, height);
    checkbox.updateRect({ x: 0, y: 0, width, height });
    checkbox.render(screen);
    return { checkbox, screen };
}

/** Read a single row from the back buffer as a plain string. */
function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

function cellAt(screen: Screen, row: number, col: number) {
    return screen.back[row]?.[col];
}

describe('Checkbox', () => {

    // ── 1. Default render ────────────────────────────────────────────────
    describe('1. Default render', () => {
        it('renders label in the widget', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderCheckbox('Dark mode');
            expect(rowText(screen, 0)).toContain('Dark mode');
        });

        it('renders unchecked box by default', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderCheckbox('Dark mode');
            const text = rowText(screen, 0);
            expect(text).toContain('[ ]');
        });

        it('renders checked box when checked: true', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderCheckbox('Dark mode', { checked: true });
            const text = rowText(screen, 0);
            expect(text).toContain('[✓]');
        });

        it('check mark cell has green color when checked', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderCheckbox('Dark mode', { checked: true });
            const cell = cellAt(screen, 0, 1);
            expect(cell?.fg).toEqual({ type: 'named', name: 'green' });
        });

        it('check mark cell is bold when checked', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderCheckbox('Dark mode', { checked: true });
            const cell = cellAt(screen, 0, 1);
            expect(cell?.bold).toBe(true);
        });
    });

    // ── 2. Toggle ────────────────────────────────────────────────────────
    describe('2. toggle()', () => {
        it('toggle() switches unchecked to checked', () => {
            const { checkbox } = renderCheckbox('Option');
            expect(checkbox.isChecked()).toBe(false);
            checkbox.toggle();
            expect(checkbox.isChecked()).toBe(true);
        });

        it('toggle() switches checked to unchecked', () => {
            const { checkbox } = renderCheckbox('Option', { checked: true });
            checkbox.toggle();
            expect(checkbox.isChecked()).toBe(false);
        });

        it('toggle() calls markDirty', () => {
            const { checkbox } = renderCheckbox('Option');
            const spy = vi.spyOn(checkbox, 'markDirty');
            checkbox.toggle();
            expect(spy).toHaveBeenCalled();
        });

        it('toggle() fires onChange callback', () => {
            const onChange = vi.fn();
            const { checkbox } = renderCheckbox('Option', { onChange });
            checkbox.toggle();
            expect(onChange).toHaveBeenCalledWith(true);
            checkbox.toggle();
            expect(onChange).toHaveBeenCalledWith(false);
        });

        it('toggle() is no-op when disabled', () => {
            const onChange = vi.fn();
            const { checkbox } = renderCheckbox('Option', { disabled: true, onChange });
            checkbox.toggle();
            expect(checkbox.isChecked()).toBe(false);
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    // ── 3. setChecked ─────────────────────────────────────────────────────
    describe('3. setChecked()', () => {
        it('setChecked(true) checks the checkbox', () => {
            const { checkbox } = renderCheckbox('Option');
            checkbox.setChecked(true);
            expect(checkbox.isChecked()).toBe(true);
        });

        it('setChecked(false) unchecks the checkbox', () => {
            const { checkbox } = renderCheckbox('Option', { checked: true });
            checkbox.setChecked(false);
            expect(checkbox.isChecked()).toBe(false);
        });

        it('setChecked does not mark dirty when unchanged', () => {
            const { checkbox } = renderCheckbox('Option');
            checkbox.clearDirty();
            checkbox.setChecked(false);
            expect(checkbox.isDirty).toBe(false);
        });

        it('setChecked fires onChange', () => {
            const onChange = vi.fn();
            const { checkbox } = renderCheckbox('Option', { onChange });
            checkbox.setChecked(true);
            expect(onChange).toHaveBeenCalledWith(true);
        });
    });

    // ── 4. setLabel ───────────────────────────────────────────────────────
    describe('4. setLabel()', () => {
        it('setLabel updates the label', () => {
            const { checkbox } = renderCheckbox('Old');
            checkbox.setLabel('New');
            expect(checkbox.getLabel()).toBe('New');
        });

        it('setLabel calls markDirty', () => {
            const { checkbox } = renderCheckbox('Old');
            const spy = vi.spyOn(checkbox, 'markDirty');
            checkbox.setLabel('New');
            expect(spy).toHaveBeenCalled();
        });

        it('setLabel does not mark dirty when unchanged', () => {
            const { checkbox } = renderCheckbox('Same');
            checkbox.clearDirty();
            checkbox.setLabel('Same');
            expect(checkbox.isDirty).toBe(false);
        });
    });

    // ── 5. setDisabled ────────────────────────────────────────────────────
    describe('5. setDisabled()', () => {
        it('setDisabled(true) disables the checkbox', () => {
            const { checkbox } = renderCheckbox('Option');
            checkbox.setDisabled(true);
            expect(checkbox.isDisabled()).toBe(true);
        });

        it('setDisabled calls markDirty', () => {
            const { checkbox } = renderCheckbox('Option');
            const spy = vi.spyOn(checkbox, 'markDirty');
            checkbox.setDisabled(true);
            expect(spy).toHaveBeenCalled();
        });

        it('setDisabled does not mark dirty when unchanged', () => {
            const { checkbox } = renderCheckbox('Option');
            checkbox.clearDirty();
            checkbox.setDisabled(false);
            expect(checkbox.isDirty).toBe(false);
        });
    });

    // ── 6. Keyboard ───────────────────────────────────────────────────────
    describe('6. Keyboard', () => {
        it('enter key toggles the checkbox', () => {
            const { checkbox } = renderCheckbox('Option');
            checkbox.handleKey(makeKeyEvent('enter'));
            expect(checkbox.isChecked()).toBe(true);
        });

        it('space key toggles the checkbox', () => {
            const { checkbox } = renderCheckbox('Option');
            checkbox.handleKey(makeKeyEvent('space'));
            expect(checkbox.isChecked()).toBe(true);
        });

        it('enter key does not toggle when disabled', () => {
            const { checkbox } = renderCheckbox('Option', { disabled: true });
            checkbox.handleKey(makeKeyEvent('enter'));
            expect(checkbox.isChecked()).toBe(false);
        });

        it('other keys are ignored', () => {
            const { checkbox } = renderCheckbox('Option');
            checkbox.handleKey(makeKeyEvent('a'));
            expect(checkbox.isChecked()).toBe(false);
        });
    });

    // ── 7. Unicode fallback ───────────────────────────────────────────────
    describe('7. Unicode fallback', () => {
        it('uses ✓ for checked when unicode is available', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderCheckbox('Option', { checked: true });
            expect(cellAt(screen, 0, 1)?.char).toBe('✓');
        });

        it('uses + for checked when caps.unicode is false', async () => {
            vi.stubEnv('NO_UNICODE', '1');
            vi.stubEnv('TERM', '');
            vi.resetModules();
            const { Screen } = await import('@termuijs/core');
            const { Checkbox } = await import('./Checkbox.js');
            const checkbox = new Checkbox('Option', {}, { checked: true });
            const screen = new Screen(20, 1);
            checkbox.updateRect({ x: 0, y: 0, width: 20, height: 1 });
            checkbox.render(screen);
            expect(screen.back[0][1].char).toBe('+');
        });

        it('uses space for unchecked in both modes', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderCheckbox('Option', { checked: false });
            expect(cellAt(screen, 0, 1)?.char).toBe(' ');
        });
    });

    // ── 8. Edge cases ─────────────────────────────────────────────────────
    describe('8. Edge cases', () => {
        it('handles zero-size rect without error', () => {
            expect(() => renderCheckbox('Option', {}, {}, 0, 0)).not.toThrow();
        });

        it('is focusable by default', () => {
            const checkbox = new Checkbox('Option');
            expect(checkbox.focusable).toBe(true);
        });
    });

    // ── 9. State consistency under mixed operations ───────────────────────
    describe('9. State consistency', () => {
        it('isChecked() always reflects actual state after mixed operations', () => {
            const { checkbox } = renderCheckbox('Test', { checked: false });

            // Start: false
            expect(checkbox.isChecked()).toBe(false);

            checkbox.toggle(); // → true
            expect(checkbox.isChecked()).toBe(true);

            checkbox.setChecked(true); // no-op
            expect(checkbox.isChecked()).toBe(true);

            checkbox.handleKey(makeKeyEvent('space')); // → false
            expect(checkbox.isChecked()).toBe(false);

            checkbox.setChecked(false); // no-op
            expect(checkbox.isChecked()).toBe(false);

            checkbox.toggle(); // → true
            expect(checkbox.isChecked()).toBe(true);

            checkbox.handleKey(makeKeyEvent('space')); // → false
            expect(checkbox.isChecked()).toBe(false);
        });
    });

    describe('10. Truncation rendering styling consistency', () => {
        it('preserves focused colors and checkmark state when label is truncated', () => {
            const checkbox = new Checkbox('Very long notification label description', {}, { checked: true });
            checkbox.isFocused = true;
            checkbox.updateRect({ x: 0, y: 0, width: 8, height: 1 });
            const screen = new Screen(8, 1);
            checkbox.render(screen);

            // Left and right brackets of box should have focusColor (cyan)
            expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'cyan' });
            expect(screen.back[0][2].fg).toEqual({ type: 'named', name: 'cyan' });

            // Checkmark should be colored green
            expect(screen.back[0][1].char).toBe(caps.unicode ? '✓' : '+');
            expect(screen.back[0][1].fg).toEqual({ type: 'named', name: 'green' });
        });
    });
});
