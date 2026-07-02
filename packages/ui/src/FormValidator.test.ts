import { describe, it, expect } from 'vitest';
import { createValidator } from './FormValidator.js';

describe('FormValidator', () => {
    it('should validate required fields', () => {
        const validator = createValidator({
            username: ['required']
        });

        const res1 = validator.validate({ username: '' });
        expect(res1.valid).toBe(false);
        expect(res1.errors.username).toContain('username is required');

        const res2 = validator.validate({ username: '  ' });
        expect(res2.valid).toBe(false);

        const res3 = validator.validate({ username: 'john_doe' });
        expect(res3.valid).toBe(true);
        expect(res3.errors.username).toBeUndefined();
    });

    it('should validate email format', () => {
        const validator = createValidator({
            email: ['email']
        });

        // if empty and not required, it should be valid
        const res1 = validator.validate({ email: '' });
        expect(res1.valid).toBe(true);

        const res2 = validator.validate({ email: 'invalid-email' });
        expect(res2.valid).toBe(false);
        expect(res2.errors.email).toContain('Invalid email address');

        const res3 = validator.validate({ email: 'test@example.com' });
        expect(res3.valid).toBe(true);
    });

    it('should validate minimum character length', () => {
        const validator = createValidator({
            password: ['min:6']
        });

        const res1 = validator.validate({ password: '12345' });
        expect(res1.valid).toBe(false);
        expect(res1.errors.password).toContain('password must be at least 6 characters');

        const res2 = validator.validate({ password: '123456' });
        expect(res2.valid).toBe(true);
    });

    it('should combine multiple rules', () => {
        const validator = createValidator({
            email: ['required', 'email']
        });

        const res1 = validator.validate({ email: '' });
        expect(res1.valid).toBe(false);
        expect(res1.errors.email).toContain('email is required');

        const res2 = validator.validate({ email: 'invalid' });
        expect(res2.valid).toBe(false);
        expect(res2.errors.email).toContain('Invalid email address');
        expect(res2.errors.email).not.toContain('email is required');

        const res3 = validator.validate({ email: 'john@example.com' });
        expect(res3.valid).toBe(true);
    });
});
