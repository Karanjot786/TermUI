import { describe, expect, it } from 'vitest';
import { useCommandPalette } from './useCommandPalette.js';
import { CommandPalette } from '../CommandPalette.js';

describe('useCommandPalette', () => {
    it('returns a palette and handleKey function', () => {
        const { palette, handleKey } = useCommandPalette({
            commands: [{ id: '1', label: 'Test', action: () => {} }]
        });
        
        expect(palette).toBeInstanceOf(CommandPalette);
        expect(typeof handleKey).toBe('function');
    });
});
