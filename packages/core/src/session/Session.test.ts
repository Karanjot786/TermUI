import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSession, Session } from './Session.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

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

describe('Session persistence', () => {
    const testPath = '/tmp/termui-test-session.json';

    beforeEach(() => {
        const dir = dirname(testPath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        if (existsSync(testPath)) unlinkSync(testPath);
    });

    afterEach(() => {
        if (existsSync(testPath)) unlinkSync(testPath);
    });

    it('persists data to disk and restores it across instances', () => {
        const s1 = createSession({ storagePath: testPath });
        s1.set('theme', 'dark');
        s1.set('volume', 75);
        s1.save();

        const s2 = createSession({ storagePath: testPath });
        expect(s2.get('theme')).toBe('dark');
        expect(s2.get('volume')).toBe(75);
    });

    it('survives application restart cycle', () => {
        const s1 = createSession({ storagePath: testPath });
        s1.set('user', { name: 'alice', role: 'admin' });
        s1.save();

        const s2 = createSession({ storagePath: testPath });
        expect(s2.get('user')).toEqual({ name: 'alice', role: 'admin' });
    });

    it('handles corrupt JSON gracefully', () => {
        const dir = dirname(testPath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        require('node:fs').writeFileSync(testPath, 'not-valid-json');

        const s = createSession({ storagePath: testPath });
        expect(s.get('anything')).toBeUndefined();
    });

    it('handles missing file gracefully on first run', () => {
        const s = createSession({ storagePath: testPath });
        expect(s.get('anything')).toBeUndefined();
    });
});
