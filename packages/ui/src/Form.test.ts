import { describe, it, expect, vi } from 'vitest';
import { render } from '@termuijs/testing';
import { createElement, useRef } from '@termuijs/jsx';
import { Form, type FormField } from './Form.js';

describe('Form', () => {
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
