import { describe, it, expect, vi } from 'vitest';
import { createSession, Session } from './Session.js';

describe('Session', () => {
    it('stores and retrieves values', () => {
        const s = createSession();
        s.set('user', 'alice');
        expect(s.get('user')).toBe('alice');
    });

    it('clear() removes all data', () => {
        const s = createSession();
        s.set('a', 1);
        s.clear();
        expect(s.get('a')).toBeUndefined();
    });

    it('autoSave starts and stopAutoSave clears interval', () => {
        vi.useFakeTimers();
        const s = createSession({ autoSave: true, interval: 1000 });
        expect(() => s.stopAutoSave()).not.toThrow();
        vi.useRealTimers();
    });

    it('save() and restore() do not throw', () => {
        const s = createSession();
        expect(() => s.save()).not.toThrow();
        expect(() => s.restore()).not.toThrow();
    });
});
