import { describe, it, expect } from 'vitest';
import { deriveTheme } from './derive.js';

describe('deriveTheme', () => {
    it('derives semantic roles from Normal colors', () => {
        const theme = deriveTheme({
            Normal: { fg: '#c0caf5', bg: '#1a1b26' },
        });

        expect(theme.Normal).toEqual({ fg: '#c0caf5', bg: '#1a1b26' });
        expect(theme.Focus).toEqual({ fg: '#1a1b26', bg: '#c0caf5' });
        expect(theme.Active).toEqual({ fg: '#3c3d47', bg: '#c9d2f7', bold: true });
        expect(theme.Disabled).toEqual({ fg: '#3a3c49', bg: '#1a1b26' });
        expect(theme.Highlight).toEqual({ fg: '#1a1b26', bg: '#c0caf5', italic: true });
    });

    it('normalizes named colors and hex colors to full hex strings', () => {
        const theme = deriveTheme({ Normal: { fg: 'white', bg: '#000' } });
        expect(theme.Normal.fg).toBe('#aaaaaa');
        expect(theme.Normal.bg).toBe('#000000');
    });

    it('throws when colors are invalid', () => {
        expect(() => deriveTheme({ Normal: { fg: 'not-a-color', bg: '#000' } })).toThrow();
    });
});
