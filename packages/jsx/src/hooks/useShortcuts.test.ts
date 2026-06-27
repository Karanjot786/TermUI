import { describe, it, expect } from 'vitest';
import { registerShortcut, useShortcuts } from './useShortcuts.js';

describe('useShortcuts hook', () => {
    it('returns empty array initially or already registered shortcuts', () => {
        const initial = useShortcuts();
        expect(Array.isArray(initial)).toBe(true);
    });

    it('registers new shortcut and returns updated list', () => {
        const initialLength = useShortcuts().length;

        const newShortcut = {
            key: 'ctrl+k',
            description: 'Clear console',
            category: 'general',
        };

        registerShortcut(newShortcut);

        const updated = useShortcuts();
        expect(updated).toHaveLength(initialLength + 1);
        expect(updated[updated.length - 1]).toEqual(newShortcut);
    });
});
