// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for Built-in Themes
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getBuiltinThemeNames, getBuiltinTheme, getAllBuiltinThemes } from './themes.js';

describe('Built-in Themes', () => {
    it('getBuiltinThemeNames returns all theme names', () => {
        const names = getBuiltinThemeNames();
        expect(names).toContain('default');
        expect(names).toContain('cyberpunk');
        expect(names).toContain('nord');
        expect(names).toContain('dracula');
        expect(names).toContain('catppuccin');
        expect(names).toContain('solarized');
        expect(names).toContain('highContrast');
        expect(names).toContain('gruvbox');
        expect(names).toContain('tokyo-night');
        expect(names).toHaveLength(9);
    });

     it('tokyo-night theme contains expected palette values', () => {
        const src = getBuiltinTheme('tokyo-night');

        expect(src).toContain('--primary: #7aa2f7');
        expect(src).toContain('--bg: #1a1b26');
        expect(src).toContain('--text: #a9b1d6');
    });

    it('getBuiltinTheme returns source for valid name', () => {
        const src = getBuiltinTheme('nord');
        expect(src).toBeDefined();
        expect(src).toContain('@theme nord');
    });

    it('getBuiltinTheme returns undefined for unknown name', () => {
        expect(getBuiltinTheme('nonexistent')).toBeUndefined();
    });

    it('getAllBuiltinThemes combines all sources', () => {
        const combined = getAllBuiltinThemes();
        expect(combined).toContain('@theme default');
        expect(combined).toContain('@theme nord');
        expect(combined).toContain('@theme cyberpunk');
        expect(combined).toContain('@theme highContrast');
    });

    it('highContrast theme uses strong foreground and focus contrast tokens', () => {
        const src = getBuiltinTheme('highContrast');
        expect(src).toContain('--bg: #000000');
        expect(src).toContain('--text: #ffffff');
        expect(src).toContain('--border-color: #ffffff');
        expect(src).toContain('--border-focus: #00ffff');

         });

    it('nord theme uses official Nord palette hex values', () => {
        const src = getBuiltinTheme('nord');
        expect(src).toContain('--bg: #2e3440');
        expect(src).toContain('--primary: #88c0d0');
        expect(src).toContain('--error: #bf616a');
    });

    it('loads the gruvbox theme with correct palette values', () => {
        const src = getBuiltinTheme('gruvbox');

        expect(src).toBeDefined();

        expect(src).toContain('@theme gruvbox');
        expect(src).toContain('--bg: #282828');
        expect(src).toContain('--text: #ebdbb2');
        expect(src).toContain('--primary: #458588');
    });
});
