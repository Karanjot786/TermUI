import {
    TermUIError,
    TermUIAbortError,
    TermUICancelError,
    TermUIValidationError,
} from './errors.js';

describe('TermUI errors', () => {
    test('TermUIError extends Error', () => {
        const err = new TermUIError('base');

        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(TermUIError);
        expect(err.name).toBe('TermUIError');
        expect(err.message).toBe('base');
    });

    test('TermUIAbortError instanceof relationships', () => {
        const err = new TermUIAbortError();

        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(TermUIError);
        expect(err).toBeInstanceOf(TermUIAbortError);
        expect(err.name).toBe('TermUIAbortError');
    });

    test('TermUICancelError instanceof relationships', () => {
        const err = new TermUICancelError();

        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(TermUIError);
        expect(err).toBeInstanceOf(TermUICancelError);
        expect(err.name).toBe('TermUICancelError');
    });

    test('TermUIValidationError carries field and message', () => {
        const err = new TermUIValidationError(
            'email',
            'Required'
        );

        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(TermUIError);
        expect(err).toBeInstanceOf(TermUIValidationError);

        expect(err.name).toBe('TermUIValidationError');
        expect(err.field).toBe('email');
        expect(err.message).toBe('Required');
    });
});