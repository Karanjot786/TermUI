import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validateInput } from './validation.js';

describe('validateInput', () => {
    it('returns undefined when validator is undefined', async () => {
        expect(await validateInput(undefined, 'hello')).toBeUndefined();
    });

    it('supports function validators', async () => {
        const result = await validateInput(
            (v) => v === 'ok' ? undefined : 'Invalid value',
            'bad',
        );

        expect(result).toBe('Invalid value');
    });

    it('supports Standard Schema validators', async () => {
        const schema = z.string().email();

        const result = await validateInput(
            schema,
            'not-an-email',
        );

        expect(result).toBeDefined();
    });

    it('passes valid Standard Schema values', async () => {
        const schema = z.string().email();

        const result = await validateInput(
            schema,
            'test@example.com',
        );

        expect(result).toBeUndefined();
    });

    it('supports async function validators', async () => {
        const result = await validateInput(
            async (v) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return v === 'ok' ? undefined : 'Async error';
            },
            'bad',
        );

        expect(result).toBe('Async error');
    });
});
