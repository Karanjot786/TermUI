// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Checkbox widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, createKeyEvent } from '@termuijs/core';
import { Checkbox } from './Checkbox.js';

/** Build a minimal KeyEvent for a given key name. */
function key(name: string) {
    return createKeyEvent({
        key: name,
        raw: Buffer.from([]),
        ctrl: false,
        alt: false,
        shift: false,
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────

describe('Checkbox — initial state', () => {
    it('starts unchecked when defaultChecked is omitted', () => {
        const checkbox = new Checkbox({ label: 'Test' });

        expect(checkbox.checked).toBe(false);
    });

    it('starts checked when defaultChecked is true', () => {
        const checkbox = new Checkbox({
            label: 'Enable logging',
            defaultChecked: true,
        });

        expect(checkbox.checked).toBe(true);
    });

    it('starts unchecked when defaultChecked is explicitly false', () => {
        const checkbox = new Checkbox({
            label: 'Enable logging',
            defaultChecked: false,
        });

        expect(checkbox.checked).toBe(false);
    });
});

// ─────────────────────────────────────────────────────
// Keyboard interaction
// ─────────────────────────────────────────────────────

describe('Checkbox — keyboard interaction', () => {
    it('toggles on space key (first press)', () => {
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: false });

        checkbox.handleKey(key('space'));

        expect(checkbox.checked).toBe(true);
    });

    it('alternates state across three space presses', () => {
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: false });

        checkbox.handleKey(key('space')); // → true
        expect(checkbox.checked).toBe(true);

        checkbox.handleKey(key('space')); // → false
        expect(checkbox.checked).toBe(false);

        checkbox.handleKey(key('space')); // → true
        expect(checkbox.checked).toBe(true);
    });

    it('does not throw on repeated space presses', () => {
        const checkbox = new Checkbox({ label: 'Test' });

        expect(() => {
            for (let i = 0; i < 10; i++) {
                checkbox.handleKey(key('space'));
            }
        }).not.toThrow();
    });

    it.each(['enter', 'up', 'down', 'left', 'right', 'escape', 'tab'])(
        'ignores key "%s" — checked state stays false',
        (keyName) => {
            const checkbox = new Checkbox({ label: 'Test', defaultChecked: false });

            expect(() => {
                checkbox.handleKey(key(keyName));
            }).not.toThrow();

            expect(checkbox.checked).toBe(false);
        },
    );
});

// ─────────────────────────────────────────────────────
// setChecked
// ─────────────────────────────────────────────────────

describe('Checkbox — setChecked()', () => {
    it('setChecked(true) makes an unchecked checkbox checked', () => {
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: false });

        checkbox.setChecked(true);

        expect(checkbox.checked).toBe(true);
    });

    it('setChecked(false) makes a checked checkbox unchecked', () => {
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: true });

        checkbox.setChecked(false);

        expect(checkbox.checked).toBe(false);
    });

    it('setChecked with current value does not call onChange', () => {
        const onChange = vi.fn();
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: false, onChange });

        checkbox.setChecked(false); // same value — no-op

        expect(onChange).not.toHaveBeenCalled();
    });

    it('setChecked(false) twice calls onChange only once', () => {
        const onChange = vi.fn();
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: true, onChange });

        checkbox.setChecked(false); // state changes: true → false  →  fired
        checkbox.setChecked(false); // same value — no-op

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(false);
    });
});

// ─────────────────────────────────────────────────────
// toggle()
// ─────────────────────────────────────────────────────

describe('Checkbox — toggle()', () => {
    it('alternates checked state on successive toggle() calls', () => {
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: false });

        checkbox.toggle();
        expect(checkbox.checked).toBe(true);

        checkbox.toggle();
        expect(checkbox.checked).toBe(false);

        checkbox.toggle();
        expect(checkbox.checked).toBe(true);
    });
});

// ─────────────────────────────────────────────────────
// onChange callback
// ─────────────────────────────────────────────────────

describe('Checkbox — onChange callback', () => {
    it('passes true to onChange when toggled from false', () => {
        const onChange = vi.fn();
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: false, onChange });

        checkbox.toggle();

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('passes false to onChange when toggled from true', () => {
        const onChange = vi.fn();
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: true, onChange });

        checkbox.toggle();

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('fires onChange on every real state change', () => {
        const onChange = vi.fn();
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: false, onChange });

        checkbox.toggle(); // false → true  (1)
        checkbox.toggle(); // true  → false (2)
        checkbox.toggle(); // false → true  (3)

        expect(onChange).toHaveBeenCalledTimes(3);
        expect(onChange).toHaveBeenNthCalledWith(1, true);
        expect(onChange).toHaveBeenNthCalledWith(2, false);
        expect(onChange).toHaveBeenNthCalledWith(3, true);
    });

    it('does not fire onChange when setChecked is called with the current value', () => {
        const onChange = vi.fn();
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: false, onChange });

        checkbox.setChecked(false);
        checkbox.setChecked(false);

        expect(onChange).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────

describe('Checkbox — rendering', () => {
    it('renders unchecked state as "[ ] Label"', () => {
        const checkbox = new Checkbox({ label: 'Label', defaultChecked: false });
        const screen = new Screen(40, 1);
        checkbox.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        checkbox.render(screen);

        const row = screen.back[0].map((c) => c.char).join('').trimEnd();
        expect(row).toContain('[ ] Label');
    });

    it('renders checked state as "[x] Label"', () => {
        const checkbox = new Checkbox({ label: 'Label', defaultChecked: true });
        const screen = new Screen(40, 1);
        checkbox.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        checkbox.render(screen);

        const row = screen.back[0].map((c) => c.char).join('').trimEnd();
        expect(row).toContain('[x] Label');
    });

    it('reflects the checked marker after toggling', () => {
        const checkbox = new Checkbox({ label: 'Label', defaultChecked: false });
        const screen = new Screen(40, 1);
        checkbox.updateRect({ x: 0, y: 0, width: 40, height: 1 });

        checkbox.toggle();
        checkbox.render(screen);

        const row = screen.back[0].map((c) => c.char).join('');
        expect(row).toContain('[x]');
    });

    it('clips output to the available width without throwing', () => {
        // Width smaller than "[ ] Label" (9 chars)
        const checkbox = new Checkbox({ label: 'Label', defaultChecked: false });
        const screen = new Screen(5, 1);
        checkbox.updateRect({ x: 0, y: 0, width: 5, height: 1 });

        expect(() => checkbox.render(screen)).not.toThrow();

        // Should only have 5 characters written
        const row = screen.back[0].map((c) => c.char).join('');
        expect(row.length).toBe(5);
    });

    it('exits safely when width is zero', () => {
        const checkbox = new Checkbox({ label: 'Label', defaultChecked: false });
        const screen = new Screen(40, 1);
        checkbox.updateRect({ x: 0, y: 0, width: 0, height: 1 });

        expect(() => checkbox.render(screen)).not.toThrow();
    });

    it('renders an empty label without throwing', () => {
        const checkbox = new Checkbox({ label: '', defaultChecked: false });
        const screen = new Screen(10, 1);
        checkbox.updateRect({ x: 0, y: 0, width: 10, height: 1 });

        expect(() => checkbox.render(screen)).not.toThrow();

        const row = screen.back[0].map((c) => c.char).join('');
        expect(row).toContain('[ ]');
    });

    it('toggle still works with empty label', () => {
        const checkbox = new Checkbox({ label: '' });

        expect(() => checkbox.toggle()).not.toThrow();
        expect(checkbox.checked).toBe(true);
    });

    it('renders a very long label clipped to width without out-of-bounds writes', () => {
        const longLabel = 'A'.repeat(200);
        const checkbox = new Checkbox({ label: longLabel, defaultChecked: false });
        const screen = new Screen(40, 1);
        checkbox.updateRect({ x: 0, y: 0, width: 40, height: 1 });

        expect(() => checkbox.render(screen)).not.toThrow();

        // All 40 columns should have valid single-character content
        for (let col = 0; col < 40; col++) {
            expect(screen.back[0][col].char.length).toBeGreaterThanOrEqual(0);
        }

        const row = screen.back[0].map((c) => c.char).join('');
        expect(row.length).toBe(40);
    });
});

// ─────────────────────────────────────────────────────
// Focusability
// ─────────────────────────────────────────────────────

describe('Checkbox — focusability', () => {
    it('is focusable', () => {
        const checkbox = new Checkbox({ label: 'Test' });

        expect(checkbox.focusable).toBe(true);
    });
});

// ─────────────────────────────────────────────────────
// State consistency under mixed operations
// ─────────────────────────────────────────────────────

describe('Checkbox — state consistency', () => {
    it('checked getter always reflects the actual state after mixed operations', () => {
        const checkbox = new Checkbox({ label: 'Test', defaultChecked: false });

        // Start: false
        expect(checkbox.checked).toBe(false);

        checkbox.toggle(); // → true
        expect(checkbox.checked).toBe(true);

        checkbox.setChecked(true); // no-op
        expect(checkbox.checked).toBe(true);

        checkbox.handleKey(key('space')); // → false
        expect(checkbox.checked).toBe(false);

        checkbox.setChecked(false); // no-op
        expect(checkbox.checked).toBe(false);

        checkbox.toggle(); // → true
        expect(checkbox.checked).toBe(true);

        checkbox.handleKey(key('space')); // → false
        expect(checkbox.checked).toBe(false);
    });
});