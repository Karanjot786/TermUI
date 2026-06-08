// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Form widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { render } from '@termuijs/testing';
import { createElement, useRef } from '@termuijs/jsx';
import { Form, type FormField } from './Form.js';

// ── Helpers ───────────────────────────────────────────

/** Create a Form, set its rect, and return {form, width, height}. */
function makeForm(
    fields: FormField[],
    options: { onSubmit?: (v: Record<string, string>) => void } = {},
    width = 40,
) {
    const height = fields.length * 2 + 2; // 2 rows per field + submit row + 1 extra
    const form = new Form(fields, options);
    form.updateRect({ x: 0, y: 0, width, height });
    return { form, width, height };
}

/**
 * Render a form on a FRESH Screen each call so stale cell data from
 * previous render passes cannot bleed through into assertions.
 */
function render_(form: Form, width = 40, height = 10): string[] {
    const screen = new Screen(width, height);
    form.render(screen);
    return screen.back.map((row) => row.map((c) => c.char).join(''));
}

const TEXT_FIELDS: FormField[] = [
    { name: 'first', label: 'First', type: 'text', placeholder: 'Your name' },
    { name: 'email', label: 'Email', type: 'text', placeholder: 'you@example.com' },
];

afterEach(() => {
    vi.restoreAllMocks();
});

// ── 1. Constructor & Initialization ───────────────────

describe('Form — constructor & initialization', () => {
    it('creates with an empty fields array without throwing', () => {
        expect(() => new Form([])).not.toThrow();
    });

    it('initializes every field value to an empty string', () => {
        const form = new Form(TEXT_FIELDS);
        expect(form.values).toEqual({ first: '', email: '' });
    });

    it('values getter returns all field keys', () => {
        const form = new Form(TEXT_FIELDS);
        const v = form.values;
        expect(Object.keys(v)).toEqual(['first', 'email']);
    });

    it('focusable is true', () => {
        const form = new Form(TEXT_FIELDS);
        expect(form.focusable).toBe(true);
    });

    it('style height equals fields.length * 2 + 1', () => {
        const fields: FormField[] = [
            { name: 'a', label: 'A', type: 'text' },
            { name: 'b', label: 'B', type: 'text' },
            { name: 'c', label: 'C', type: 'text' },
        ];
        const form = new Form(fields);
        // height is set in the Widget style during construction
        expect((form.style as { height?: number }).height).toBe(fields.length * 2 + 1);
    });
});

// ── 2. Values Getter ──────────────────────────────────

describe('Form — values getter', () => {
    it('returns a fresh object on every call', () => {
        const form = new Form(TEXT_FIELDS);
        const a = form.values;
        const b = form.values;
        expect(a).not.toBe(b);
    });

    it('reflects edits immediately', () => {
        const { form } = makeForm(TEXT_FIELDS);
        form.insertChar('J');
        form.insertChar('o');
        form.insertChar('e');
        expect(form.values.first).toBe('Joe');
    });

    it('returns unchanged fields with their empty defaults', () => {
        const { form } = makeForm(TEXT_FIELDS);
        form.insertChar('X');
        const v = form.values;
        expect(v.email).toBe('');
        expect(v.first).toBe('X');
    });
});

// ── 3. Field Navigation ───────────────────────────────

describe('Form — field navigation', () => {
    it('nextField advances active field', () => {
        const { form } = makeForm(TEXT_FIELDS);
        // Insert on first field then move to second
        form.insertChar('A');
        form.nextField();
        // Typing should now target 'email'
        form.insertChar('Z');
        expect(form.values.first).toBe('A');
        expect(form.values.email).toBe('Z');
    });

    it('nextField resets cursor position to 0', () => {
        // Verify by inserting mid-string then moving – subsequent insert goes to start
        const fields: FormField[] = [
            { name: 'a', label: 'A', type: 'text' },
            { name: 'b', label: 'B', type: 'text' },
        ];
        const { form } = makeForm(fields);
        form.insertChar('X');
        form.insertChar('Y');
        form.nextField();
        // Cursor is now 0 on field 'b'; inserting should produce 'Z' not appended elsewhere
        form.insertChar('Z');
        expect(form.values.b).toBe('Z');
    });

    it('prevField moves back to previous field', () => {
        const { form } = makeForm(TEXT_FIELDS);
        form.nextField();
        form.insertChar('E');
        form.prevField();
        // Active field is 'first' again; typing goes there
        form.insertChar('F');
        expect(form.values.first).toBe('F');
        expect(form.values.email).toBe('E');
    });

    it('prevField restores cursor to end of value in previous field', () => {
        const fields: FormField[] = [
            { name: 'a', label: 'A', type: 'text' },
            { name: 'b', label: 'B', type: 'text' },
        ];
        const { form } = makeForm(fields);
        form.insertChar('H');
        form.insertChar('i');
        form.nextField();
        form.prevField();
        // Cursor should be at end of 'Hi' (position 2). A deleteBack removes 'i'.
        form.deleteBack();
        expect(form.values.a).toBe('H');
    });

    it('prevField does not go below field index 0', () => {
        const { form } = makeForm(TEXT_FIELDS);
        // Calling prevField from the first field should not throw or move
        form.prevField();
        form.prevField();
        form.insertChar('X');
        expect(form.values.first).toBe('X'); // still on first field
    });

    it('nextField can reach submit row (index === fields.length)', () => {
        const fields: FormField[] = [{ name: 'a', label: 'A', type: 'text' }];
        const { form } = makeForm(fields);
        form.nextField(); // move to submit
        // Calling nextField again on submit row should not crash
        expect(() => form.nextField()).not.toThrow();
    });

    it('nextField does not advance past submit row', () => {
        const { form } = makeForm(TEXT_FIELDS);
        // Move to submit row (index 2 for 2 fields)
        form.nextField();
        form.nextField();
        // One more should be a no-op
        form.nextField();
        // insertChar on submit row is a no-op; values unchanged
        form.insertChar('X');
        expect(form.values).toEqual({ first: '', email: '' });
    });
});

// ── 4. Text Editing ───────────────────────────────────

describe('Form — text editing', () => {
    it('inserts characters sequentially', () => {
        const { form } = makeForm(TEXT_FIELDS);
        form.insertChar('A');
        form.insertChar('l');
        form.insertChar('i');
        expect(form.values.first).toBe('Ali');
    });

    it('backspace removes the last character', () => {
        const { form } = makeForm(TEXT_FIELDS);
        form.insertChar('A');
        form.insertChar('l');
        form.insertChar('i');
        form.deleteBack();
        expect(form.values.first).toBe('Al');
    });

    it('backspace at position 0 is safe and leaves value unchanged', () => {
        const { form } = makeForm(TEXT_FIELDS);
        expect(() => form.deleteBack()).not.toThrow();
        expect(form.values.first).toBe('');
    });

    it('repeated backspace empties field', () => {
        const { form } = makeForm(TEXT_FIELDS);
        form.insertChar('X');
        form.insertChar('Y');
        form.deleteBack();
        form.deleteBack();
        form.deleteBack(); // extra — should be safe
        expect(form.values.first).toBe('');
    });

    it('insertChar on submit row is a no-op', () => {
        const { form } = makeForm(TEXT_FIELDS);
        form.nextField();
        form.nextField(); // at submit
        form.insertChar('Z');
        expect(form.values).toEqual({ first: '', email: '' });
    });

    it('editing clears existing validation error for that field', () => {
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text', required: true }];
        const { form, width, height } = makeForm(fields);
        form.submit(); // triggers required error
        let rows = render_(form, width, height);
        expect(rows.join('\n')).toContain('Name is required');

        form.insertChar('A'); // should clear the error
        rows = render_(form, width, height);
        expect(rows.join('\n')).not.toContain('Name is required');
    });
});

// ── 5. Required Validation ────────────────────────────

describe('Form — required validation', () => {
    it('required field with empty value generates error', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text', required: true }];
        const { form, width, height } = makeForm(fields, { onSubmit });
        form.submit();
        const rows = render_(form, width, height);
        expect(rows.join('\n')).toContain('Name is required');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('whitespace-only value is treated as empty by required validation', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text', required: true }];
        const { form } = makeForm(fields, { onSubmit });
        form.insertChar(' ');
        form.insertChar(' ');
        form.submit();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('multiple required fields each produce their own errors', () => {
        const fields: FormField[] = [
            { name: 'a', label: 'Alpha', type: 'text', required: true },
            { name: 'b', label: 'Beta', type: 'text', required: true },
        ];
        const { form, width, height } = makeForm(fields);
        form.submit();
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Alpha is required');
        expect(out).toContain('Beta is required');
    });

    it('non-required empty field does not block submission', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [{ name: 'opt', label: 'Optional', type: 'text' }];
        const { form } = makeForm(fields, { onSubmit });
        form.submit();
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});

// ── 6. Custom Validation ──────────────────────────────

describe('Form — custom validation', () => {
    it('custom validator blocks submit when it returns an error string', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [
            {
                name: 'age', label: 'Age', type: 'text',
                validate: (v) => (isNaN(Number(v)) ? 'Must be a number' : null),
            },
        ];
        const { form, width, height } = makeForm(fields, { onSubmit });
        form.insertChar('x');
        form.submit();
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Must be a number');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('custom validator does not block submit when it returns null', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [
            {
                name: 'age', label: 'Age', type: 'text',
                validate: (v) => (isNaN(Number(v)) ? 'Must be a number' : null),
            },
        ];
        const { form } = makeForm(fields, { onSubmit });
        form.insertChar('4');
        form.insertChar('2');
        form.submit();
        expect(onSubmit).toHaveBeenCalledWith({ age: '42' });
    });

    it('validator runs even when the field has a value', () => {
        const validate = vi.fn().mockReturnValue(null);
        const fields: FormField[] = [{ name: 'n', label: 'N', type: 'text', validate }];
        const { form } = makeForm(fields);
        form.insertChar('X');
        form.submit();
        expect(validate).toHaveBeenCalledWith('X');
    });

    it('multiple validators failing independently each render errors', () => {
        const fields: FormField[] = [
            { name: 'a', label: 'A', type: 'text', validate: () => 'Error A' },
            { name: 'b', label: 'B', type: 'text', validate: () => 'Error B' },
        ];
        const { form, width, height } = makeForm(fields);
        form.submit();
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Error A');
        expect(out).toContain('Error B');
    });

    it('required and custom validator can coexist – submit is blocked when value is empty', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [
            {
                name: 'n', label: 'Name', type: 'text', required: true,
                validate: () => 'Custom error',
            },
        ];
        const { form } = makeForm(fields, { onSubmit });
        form.submit();
        expect(onSubmit).not.toHaveBeenCalled();
    });
});

// ── 7. Successful Submission ──────────────────────────

describe('Form — successful submission', () => {
    it('onSubmit fires exactly once when all validation passes', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [
            { name: 'first', label: 'First', type: 'text', required: true },
            { name: 'num', label: 'Number', type: 'text', validate: (v) => isNaN(Number(v)) ? 'Must be a number' : null },
        ];
        const { form } = makeForm(fields, { onSubmit });
        form.insertChar('J'); form.insertChar('o'); form.insertChar('e');
        form.nextField();
        form.insertChar('4'); form.insertChar('2');
        form.submit();
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ first: 'Joe', num: '42' });
    });

    it('submitted payload matches values getter at submission time', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [{ name: 'x', label: 'X', type: 'text' }];
        const { form } = makeForm(fields, { onSubmit });
        form.insertChar('H'); form.insertChar('i');
        const expected = form.values;
        form.submit();
        expect(onSubmit).toHaveBeenCalledWith(expected);
    });

    it('no errors remain visible after successful submit', () => {
        // First submit fails, then we fix and resubmit
        const onSubmit = vi.fn();
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text', required: true }];
        const { form, width, height } = makeForm(fields, { onSubmit });
        form.submit(); // fails
        form.insertChar('A');
        form.submit(); // succeeds
        const out = render_(form, width, height).join('\n');
        expect(out).not.toContain('Name is required');
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});

// ── 8. Rendering ──────────────────────────────────────

describe('Form — rendering', () => {
    it('renders field labels', () => {
        const { form, width, height } = makeForm(TEXT_FIELDS);
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('First:');
        expect(out).toContain('Email:');
    });

    it('renders required marker (*) next to required field labels', () => {
        const fields: FormField[] = [
            { name: 'n', label: 'Name', type: 'text', required: true },
        ];
        const { form, width, height } = makeForm(fields);
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Name *:');
    });

    it('does not render required marker for optional fields', () => {
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text' }];
        const { form, width, height } = makeForm(fields);
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Name:');
        expect(out).not.toContain('Name *:');
    });

    it('renders placeholder when value is empty', () => {
        const { form, width, height } = makeForm(TEXT_FIELDS);
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Your name');
        expect(out).toContain('you@example.com');
    });

    it('placeholder disappears once a value is typed', () => {
        const { form, width, height } = makeForm(TEXT_FIELDS);
        form.insertChar('Z');
        const out = render_(form, width, height).join('\n');
        expect(out).not.toContain('Your name');
    });

    it('renders typed value in the input row', () => {
        const { form, width, height } = makeForm(TEXT_FIELDS);
        form.insertChar('A'); form.insertChar('l'); form.insertChar('i');
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Ali');
    });

    it('renders active indicator (❯) on the active field', () => {
        const { form, width, height } = makeForm(TEXT_FIELDS);
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('❯');
    });

    it('renders submit row with Submit text', () => {
        const { form, width, height } = makeForm(TEXT_FIELDS);
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Submit');
    });

    it('renders highlighted submit row when submit is active', () => {
        const { form, width, height } = makeForm(TEXT_FIELDS);
        form.nextField(); // past first
        form.nextField(); // past second → submit row
        const out = render_(form, width, height).join('\n');
        // Submit row renders with brackets when active
        expect(out).toContain('[ Submit ]');
    });

    it('renders inline validation error message', () => {
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text', required: true }];
        const { form, width, height } = makeForm(fields);
        form.submit();
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Name is required');
    });

    it('renders safely with width = 0 (no throw)', () => {
        const form = new Form(TEXT_FIELDS);
        const screen = new Screen(40, 10);
        form.updateRect({ x: 0, y: 0, width: 0, height: 10 });
        expect(() => form.render(screen)).not.toThrow();
    });

    it('renders safely with height = 0 (no throw)', () => {
        const form = new Form(TEXT_FIELDS);
        const screen = new Screen(40, 10);
        form.updateRect({ x: 0, y: 0, width: 40, height: 0 });
        expect(() => form.render(screen)).not.toThrow();
    });
});

// ── 9. Edge Cases ─────────────────────────────────────

describe('Form — edge cases', () => {
    it('empty form renders safely', () => {
        const form = new Form([]);
        const screen = new Screen(40, 5);
        form.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        expect(() => form.render(screen)).not.toThrow();
    });

    it('single-field form renders correctly', () => {
        const fields: FormField[] = [{ name: 'only', label: 'Only', type: 'text' }];
        const { form, width, height } = makeForm(fields);
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Only:');
    });

    it('very long label renders without crashing', () => {
        const longLabel = 'A'.repeat(200);
        const fields: FormField[] = [{ name: 'l', label: longLabel, type: 'text' }];
        const { form, width, height } = makeForm(fields, {}, 40);
        expect(() => render_(form, width, height)).not.toThrow();
    });

    it('very long input value renders safely', () => {
        const fields: FormField[] = [{ name: 'v', label: 'Val', type: 'text' }];
        const { form, width, height } = makeForm(fields, {}, 40);
        for (let i = 0; i < 200; i++) form.insertChar('x');
        expect(() => render_(form, width, height)).not.toThrow();
    });

    it('form with 20+ fields initializes without error', () => {
        const fields: FormField[] = Array.from({ length: 20 }, (_, i) => ({
            name: `f${i}`, label: `Field ${i}`, type: 'text' as const,
        }));
        expect(() => new Form(fields)).not.toThrow();
        const form = new Form(fields);
        expect(Object.keys(form.values)).toHaveLength(20);
    });

    it('repeated navigation beyond bounds does not throw', () => {
        const { form } = makeForm(TEXT_FIELDS);
        expect(() => {
            for (let i = 0; i < 10; i++) form.prevField();
            for (let i = 0; i < 10; i++) form.nextField();
        }).not.toThrow();
    });

    it('multiple consecutive submits do not throw', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text' }];
        const { form } = makeForm(fields, { onSubmit });
        expect(() => {
            form.submit();
            form.submit();
            form.submit();
        }).not.toThrow();
    });
});

// ── 10. Dirty State ───────────────────────────────────

describe('Form — markDirty', () => {
    it('markDirty is called when inserting a character', () => {
        const { form } = makeForm(TEXT_FIELDS);
        const spy = vi.spyOn(form as unknown as { markDirty(): void }, 'markDirty');
        form.insertChar('A');
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty is called when deleting a character', () => {
        const { form } = makeForm(TEXT_FIELDS);
        form.insertChar('A');
        const spy = vi.spyOn(form as unknown as { markDirty(): void }, 'markDirty');
        form.deleteBack();
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty is called when changing fields (nextField)', () => {
        const { form } = makeForm(TEXT_FIELDS);
        const spy = vi.spyOn(form as unknown as { markDirty(): void }, 'markDirty');
        form.nextField();
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty is called when changing fields (prevField)', () => {
        const { form } = makeForm(TEXT_FIELDS);
        form.nextField();
        const spy = vi.spyOn(form as unknown as { markDirty(): void }, 'markDirty');
        form.prevField();
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty is called on submit', () => {
        const { form } = makeForm(TEXT_FIELDS);
        const spy = vi.spyOn(form as unknown as { markDirty(): void }, 'markDirty');
        form.submit();
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty is NOT called when prevField is already at index 0', () => {
        const { form } = makeForm(TEXT_FIELDS);
        const spy = vi.spyOn(form as unknown as { markDirty(): void }, 'markDirty');
        form.prevField(); // already at 0 — should not mark dirty
        expect(spy).not.toHaveBeenCalled();
    });

    it('markDirty is NOT called on deleteBack when cursor is already at 0', () => {
        const { form } = makeForm(TEXT_FIELDS);
        const spy = vi.spyOn(form as unknown as { markDirty(): void }, 'markDirty');
        form.deleteBack(); // nothing to delete
        expect(spy).not.toHaveBeenCalled();
    });
});

// ── 11. Error Lifecycle ───────────────────────────────

describe('Form — error lifecycle', () => {
    it('errors appear after a failed submit', () => {
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text', required: true }];
        const { form, width, height } = makeForm(fields);
        form.submit();
        const out = render_(form, width, height).join('\n');
        expect(out).toContain('Name is required');
    });

    it('errors disappear when the affected field is edited', () => {
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text', required: true }];
        const { form, width, height } = makeForm(fields);
        form.submit();
        form.insertChar('A'); // edit clears error
        const out = render_(form, width, height).join('\n');
        expect(out).not.toContain('Name is required');
    });

    it('re-submitting with empty field re-generates the error', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text', required: true }];
        const { form } = makeForm(fields, { onSubmit });
        form.submit(); // first fail
        form.submit(); // second fail
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('successful submit clears all previous errors', () => {
        const onSubmit = vi.fn();
        const fields: FormField[] = [{ name: 'n', label: 'Name', type: 'text', required: true }];
        const { form, width, height } = makeForm(fields, { onSubmit });
        form.submit(); // fail
        form.insertChar('B');
        form.submit(); // pass
        const out = render_(form, width, height).join('\n');
        expect(out).not.toContain('Name is required');
        expect(onSubmit).toHaveBeenCalledOnce();
    });
});

// ── 12. Existing tests (preserved) ────────────────────

describe('Form — existing tests', () => {
    it('renders each declared field', () => {
        let form!: Form;
        const fields: FormField[] = [
            { name: 'first', label: 'First', type: 'text', placeholder: 'Your name' },
            { name: 'email', label: 'Email', type: 'text', placeholder: 'you@example.com' },
        ];

        const screen = render(createElement(() => {
            const ref = useRef<Form | null>(null);
            if (!ref.current) {
                ref.current = new Form(fields);
            }
            form = ref.current;
            return ref.current;
        }, null));

        const out = screen.lastFrame().join('\n');
        expect(out).toContain('First:');
        expect(out).toContain('Email:');
        expect(out).toContain('Your name');
        expect(out).toContain('you@example.com');
        screen.unmount();
    });

    it('validation runs on submit and blocks invalid fields', () => {
        let form!: Form;
        const onSubmit = vi.fn();
        const fields: FormField[] = [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'age', label: 'Age', type: 'text', validate: (v) => isNaN(Number(v)) ? 'Must be a number' : null },
        ];

        const screen = render(createElement(() => {
            const ref = useRef<Form | null>(null);
            if (!ref.current) {
                ref.current = new Form(fields, { onSubmit });
            }
            form = ref.current;
            return ref.current;
        }, null));

        // Submit with no values -> should produce required error and not call onSubmit
        form.submit();
        screen.rerender();

        // Validation message should be rendered in the UI
        const out = screen.lastFrame().join('\n');
        expect(out).toContain('Name is required');
        expect(onSubmit).not.toHaveBeenCalled();

        // Fill name but put invalid age -> age validator should block submit
        // Active field starts at 0 (name)
        form.insertChar('A'); form.insertChar('l'); form.insertChar('i');
        form.nextField();
        form.insertChar('x'); // invalid number
        form.submit();
        screen.rerender();

        const out2 = screen.lastFrame().join('\n');
        expect(out2).toContain('Must be a number');
        expect(onSubmit).not.toHaveBeenCalled();

        screen.unmount();
    });

    it('onSubmit fires with collected values when validation passes', () => {
        let form!: Form;
        const onSubmit = vi.fn();
        const fields: FormField[] = [
            { name: 'first', label: 'First', type: 'text', required: true },
            { name: 'num', label: 'Number', type: 'text', validate: (v) => isNaN(Number(v)) ? 'Must be a number' : null },
        ];

        const screen = render(createElement(() => {
            const ref = useRef<Form | null>(null);
            if (!ref.current) {
                ref.current = new Form(fields, { onSubmit });
            }
            form = ref.current;
            return ref.current;
        }, null));

        // Fill first field
        form.insertChar('J'); form.insertChar('o'); form.insertChar('e');
        form.nextField();
        // Fill numeric field
        form.insertChar('4'); form.insertChar('2');

        form.submit();
        screen.rerender();

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ first: 'Joe', num: '42' });

        screen.unmount();
    });
});
