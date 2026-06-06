// @termuijs/ui — Tests for SnippetPrompt component

import { describe, it, expect } from 'vitest';
import { SnippetPrompt } from './SnippetPrompt.js';

const TEMPLATE = '{{name}} is {{age}} years old';

describe('SnippetPrompt', () => {
    it('extracts placeholders from template', () => {
        const prompt = new SnippetPrompt(TEMPLATE);

        expect(prompt.placeholders).toEqual(['name', 'age']);
        expect(prompt.activeField).toBe('name');
        expect(prompt.values).toEqual({ name: '', age: '' });
    });

    it('buildResult replaces placeholders with values', () => {
        const prompt = new SnippetPrompt(TEMPLATE);

        prompt.setValue('name', 'Alice');
        prompt.setValue('age', '30');

        expect(prompt.buildResult()).toBe('Alice is 30 years old');
    });

    it('nextField advances the active field', () => {
        const prompt = new SnippetPrompt(TEMPLATE);

        prompt.nextField();

        expect(prompt.activeField).toBe('age');
    });

    it('prevField moves back to the previous field', () => {
        const prompt = new SnippetPrompt(TEMPLATE);

        prompt.nextField();
        prompt.prevField();

        expect(prompt.activeField).toBe('name');
    });

    it('stores validation errors per field', () => {
        const prompt = new SnippetPrompt(TEMPLATE, {
            validate: {
                age: (value) => (isNaN(Number(value)) ? 'Must be a number' : null),
            },
        });

        prompt.setValue('name', 'Alice');
        prompt.setValue('age', 'abc');

        const isValid = prompt.validate();

        expect(isValid).toBe(false);
        expect(prompt.errors).toEqual({ age: 'Must be a number' });
        expect(prompt.values.name).toBe('Alice');
        expect(prompt.errors.name).toBeUndefined();
    });

    it('validates successfully when all fields pass', () => {
        const prompt = new SnippetPrompt(TEMPLATE, {
            validate: {
                age: (value) => (isNaN(Number(value)) ? 'Must be a number' : null),
            },
        });

        prompt.setValue('name', 'Alice');
        prompt.setValue('age', '30');

        const isValid = prompt.validate();

        expect(isValid).toBe(true);
        expect(prompt.errors).toEqual({});
    });

    it('setValue() stores values for known fields', () => {
        const prompt = new SnippetPrompt(TEMPLATE);

        prompt.setValue('name', 'Alice');
        prompt.setValue('age', '30');

        expect(prompt.values).toEqual({ name: 'Alice', age: '30' });
    });

    it('ignores unknown fields safely', () => {
        const prompt = new SnippetPrompt(TEMPLATE);

        prompt.setValue('unknown', 'value');

        expect(prompt.values).toEqual({ name: '', age: '' });
        expect(prompt.buildResult()).toBe(' is  years old');
    });

    it('does not duplicate placeholders when template contains repeats', () => {
        const prompt = new SnippetPrompt('{{name}} says {{name}} is {{age}}');

        expect(prompt.placeholders).toEqual(['name', 'age']);
    });
});
