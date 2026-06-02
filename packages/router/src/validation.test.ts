import { describe, it, expect } from 'vitest';
import { validateParams, validators } from './validation.js';

describe('Router Parameter Validation', () => {
    it('validates a happy path correctly', () => {
        const schema = {
            id: validators.number(),
            action: validators.enum(['edit', 'view', 'delete'])
        };

        const params = { id: '1042', action: 'edit' };
        const result = validateParams(params, schema);

        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
    });

    it('rejects invalid parameters and tracks errors', () => {
        const schema = {
            id: validators.number()
        };

        const params = { id: 'not-a-number' };
        const result = validateParams(params, schema);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Invalid parameter: 'id' with value 'not-a-number'");
    });

    it('fails gracefully on missing parameters', () => {
        const schema = {
            id: validators.number()
        };

        const params: Record<string, string | undefined> = {};
        const result = validateParams(params, schema);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Invalid parameter: 'id' with value 'undefined'");
    });

    it('validates uuid correctly', () => {
        const schema = {
            userId: validators.uuid()
        };

        expect(validateParams({ userId: '123e4567-e89b-12d3-a456-426614174000' }, schema).valid).toBe(true);
        expect(validateParams({ userId: 'invalid-uuid-string' }, schema).valid).toBe(false);
    });

    it('string validator rejects empty or whitespace strings', () => {
        const schema = {
            slug: validators.string()
        };

        expect(validateParams({ slug: 'my-post' }, schema).valid).toBe(true);
        expect(validateParams({ slug: '' }, schema).valid).toBe(false);
        expect(validateParams({ slug: '   ' }, schema).valid).toBe(false);
        expect(validateParams({}, schema).valid).toBe(false);
    });
});