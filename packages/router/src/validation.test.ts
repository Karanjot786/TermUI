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

    // --- Boundary Tests: Malformed Route Parameters ---------------------------
    describe('boundary: URI-encoded characters in param values', () => {
        it('handles % encoded characters in param value', () => {
            const schema = { slug: validators.string() };
            expect(validateParams({ slug: 'hello%20world' }, schema).valid).toBe(true);
        });

        it('handles + encoded space in param value', () => {
            const schema = { slug: validators.string() };
            expect(validateParams({ slug: 'hello+world' }, schema).valid).toBe(true);
        });

        it('rejects param value that is only % with no valid encoding', () => {
            const schema = { id: validators.number() };
            expect(validateParams({ id: '%' }, schema).valid).toBe(false);
        });
    });

    describe('boundary: empty string where param value is expected', () => {
        it('rejects empty string for number validator', () => {
            const schema = { id: validators.number() };
            expect(validateParams({ id: '' }, schema).valid).toBe(false);
        });

        it('rejects empty string for string validator', () => {
            const schema = { name: validators.string() };
            expect(validateParams({ name: '' }, schema).valid).toBe(false);
        });

        it('rejects empty string for uuid validator', () => {
            const schema = { userId: validators.uuid() };
            expect(validateParams({ userId: '' }, schema).valid).toBe(false);
        });

        it('rejects empty string for enum validator', () => {
            const schema = { action: validators.enum(['edit', 'view']) };
            expect(validateParams({ action: '' }, schema).valid).toBe(false);
        });
    });

    describe('boundary: numeric-only param values', () => {
        it('accepts numeric-only param for number validator', () => {
            const schema = { id: validators.number() };
            expect(validateParams({ id: '42' }, schema).valid).toBe(true);
        });

        it('accepts large numeric param', () => {
            const schema = { id: validators.number() };
            expect(validateParams({ id: '9999999' }, schema).valid).toBe(true);
        });

        it('rejects numeric-only value for uuid validator', () => {
            const schema = { userId: validators.uuid() };
            expect(validateParams({ userId: '42' }, schema).valid).toBe(false);
        });
    });

    describe('boundary: params with special characters (dots and dashes)', () => {
        it('accepts param with dots for string validator', () => {
            const schema = { version: validators.string() };
            expect(validateParams({ version: '1.0.0' }, schema).valid).toBe(true);
        });

        it('accepts param with dashes for string validator', () => {
            const schema = { slug: validators.string() };
            expect(validateParams({ slug: 'my-blog-post' }, schema).valid).toBe(true);
        });

        it('accepts param with mixed dots and dashes', () => {
            const schema = { slug: validators.string() };
            expect(validateParams({ slug: 'v1.0-beta' }, schema).valid).toBe(true);
        });

        it('rejects param with only dots as a number', () => {
            const schema = { id: validators.number() };
            expect(validateParams({ id: '...' }, schema).valid).toBe(false);
        });
    });

    describe('boundary: undefined and missing params', () => {
        it('rejects undefined param for string validator', () => {
            const schema = { name: validators.string() };
            expect(validateParams({}, schema).valid).toBe(false);
        });

        it('rejects undefined param for number validator', () => {
            const schema = { id: validators.number() };
            expect(validateParams({}, schema).valid).toBe(false);
        });

        it('rejects undefined param for enum validator', () => {
            const schema = { action: validators.enum(['edit', 'view']) };
            expect(validateParams({}, schema).valid).toBe(false);
        });

        it('tracks correct error message for missing param', () => {
            const schema = { id: validators.number() };
            const result = validateParams({}, schema);
            expect(result.errors).toContain("Invalid parameter: 'id' with value 'undefined'");
        });
    });
});