/** @jsxImportSource @termuijs/jsx */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@termuijs/testing';
import { FormBuilder, useForm } from './FormBuilder.js';

function FormConsumer({ onTrigger }: { onTrigger: (submitFn: () => void) => void }) {
    const { submit } = useForm();
    onTrigger(submit);
    return null;
}

describe('FormBuilder', () => {
    it('renders children correctly', () => {
        const screen = render(
            <FormBuilder>
                <text>Child content</text>
            </FormBuilder>
        );
        expect(screen.getByText('Child content')).toBeTruthy();
    });

    it('triggers onSubmit when submit is called from useForm context', () => {
        const onSubmit = vi.fn();
        let triggerSubmit: (() => void) | undefined;

        render(
            <FormBuilder onSubmit={onSubmit}>
                <FormConsumer onTrigger={(submit) => { triggerSubmit = submit; }} />
            </FormBuilder>
        );

        expect(triggerSubmit).toBeDefined();
        triggerSubmit?.();
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('handles form context default values gracefully when not in FormBuilder', () => {
        let triggerSubmit: (() => void) | undefined;

        render(
            <FormConsumer onTrigger={(submit) => { triggerSubmit = submit; }} />
        );

        expect(triggerSubmit).toBeDefined();
        expect(() => triggerSubmit?.()).not.toThrow();
    });
});
