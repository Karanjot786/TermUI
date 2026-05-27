// ─────────────────────────────────────────────────────
// @termuijs/quick — Tests for index re-exports
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

describe('quick – index exports useNotifications', () => {
    it('re-exports useNotifications from @termuijs/ui', async () => {
        const mod = await import('./index.js');
        expect(typeof (mod as any).useNotifications).toBe('function');
    });
});

describe('quick – index exports grid (not gridWidget)', () => {
    it('exports grid directly from index', async () => {
        const mod = await import('./index.js');
        expect(typeof (mod as any).grid).toBe('function');
    });
});

describe('quick – index exports batch from @termuijs/store', () => {
    it('re-exports batch from @termuijs/store', async () => {
        const mod = await import('./index.js');
        expect(typeof (mod as any).batch).toBe('function');
    });
});
