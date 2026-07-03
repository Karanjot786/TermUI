import { describe, it, expect, vi } from 'vitest';
import { unmountApps } from './render.js';

describe('unmountApps', () => {
    it('logs errors, completes cleanup, and does not rethrow', () => {
        const err = new Error('boom');
        const throwing = { unmount: vi.fn(() => { throw err; }) };
        const called = { unmount: vi.fn(() => { /* ok */ }) };

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        try {
            // Should not throw
            expect(() => unmountApps([throwing, called])).not.toThrow();

            // Ensure the second unmount still ran
            expect(called.unmount).toHaveBeenCalledTimes(1);

            // Ensure we logged the error exactly once with the expected message
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith('[jsx] Error during unmount():', err);
        } finally {
            spy.mockRestore();
        }
    });
});
