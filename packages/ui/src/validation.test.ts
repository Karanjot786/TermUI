import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validateInput } from './validation.js';

describe('validateInput', () => {
    it('returns undefined when validator is undefined', () => {
        expect(validateInput(undefined, 'hello')).toBeUndefined();
    });

    it('supports function validators', () => {
        const result = validateInput(
            (v) => v === 'ok' ? undefined : 'Invalid value',
            'bad',
        );

        expect(result).toBe('Invalid value');
    });

    it('supports Standard Schema validators', () => {
        const schema = z.string().email();

        const result = validateInput(
            schema,
            'not-an-email',
        );

        expect(result).toBeDefined();
    });

    it('passes valid Standard Schema values', () => {
        const schema = z.string().email();

        const result = validateInput(
            schema,
            'test@example.com',
        );

        expect(result).toBeUndefined();
    });
});