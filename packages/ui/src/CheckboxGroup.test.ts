import { describe, it, expect, vi } from 'vitest';
import { CheckboxGroup } from './CheckboxGroup.js';

const OPTIONS = [
    { label: 'TypeScript', value: 'ts' },
    { label: 'ESLint', value: 'lint' },
    { label: 'Prettier', value: 'prettier' },
];

describe('CheckboxGroup', () => {
    it('initial selection uses defaultValues', () => {
        const group = new CheckboxGroup({
            options: OPTIONS,
            defaultValues: ['ts'],
        });

        expect(group.selectedValues).toEqual(['ts']);
    });

    it('toggle one item', () => {
        const group = new CheckboxGroup({
            options: OPTIONS,
        });

        group.toggleCurrent();

        expect(group.selectedValues).toEqual(['ts']);
    });

    it('onChange outputs selected values', () => {
        const onChange = vi.fn();

        const group = new CheckboxGroup({
            options: OPTIONS,
            onChange,
        });

        group.toggleCurrent();

        expect(onChange).toHaveBeenCalledWith(['ts']);
    });
});