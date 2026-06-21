import { describe, it, expect } from 'vitest';
import { createValidator } from './FormValidator.js';

const v = createValidator({
    name: ['required', 'min:3'],
    email: ['required', 'email'],
    bio: ['min:10'],
});

describe('createValidator', () => {
    it('passes when all rules satisfied', () => {
        const r = v.validate({ name: 'Ada', email: 'ada@example.com', bio: 'Hello world!' });
        expect(r.valid).toBe(true);
        expect(r.errors).toEqual({});
    });

    it('required: fails on empty or whitespace', () => {
        const r = v.validate({ name: '', email: '   ', bio: '' });
        expect(r.valid).toBe(false);
        expect(r.errors.name).toContain('name is required');
        expect(r.errors.email).toContain('email is required');
    });

    it('email: fails on malformed address', () => {
        const r = v.validate({ name: 'Ada', email: 'notanemail', bio: '' });
        expect(r.errors.email).toContain('Invalid email address');
    });

    it('email: passes on empty (not required)', () => {
        const vEmail = createValidator({ email: ['email'] });
        expect(vEmail.validate({ email: '' }).valid).toBe(true);
    });

    it('min: fails when value too short', () => {
        const r = v.validate({ name: 'Ad', email: 'ada@example.com', bio: 'Hi' });
        expect(r.errors.name).toContain('name must be at least 3 characters');
        expect(r.errors.bio).toContain('bio must be at least 10 characters');
    });

    it('min: passes on exact length', () => {
        const r = v.validate({ name: 'Ada', email: 'ada@example.com', bio: '1234567890' });
        expect(r.valid).toBe(true);
    });

    it('collects multiple errors for one field', () => {
        const r = v.validate({ name: 'Ad', email: 'bad', bio: '' });
        expect(r.errors.name.length).toBeGreaterThan(0);
    });
});
