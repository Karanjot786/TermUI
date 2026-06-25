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
        expect(names).toContain('solarizedLight');
        expect(names).toContain('highContrast');
        expect(names).toContain('gruvbox');
        expect(names).toContain('tokyo-night');
        expect(names).toContain('everforest');
        expect(names).toContain('rose-pine');
        expect(names).toHaveLength(12);
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

    it('solarized dark theme exposes correct Solarized base hex colors', () => {
        const src = getBuiltinTheme('solarized');
        expect(src).toContain('--bg: #002b36');
        expect(src).toContain('--surface: #073642');
        expect(src).toContain('--primary: #268bd2');
        expect(src).toContain('--error: #dc322f');
        expect(src).toContain('--warning: #b58900');
    });

    it('solarizedLight theme exposes correct Solarized light base hex colors', () => {
        const src = getBuiltinTheme('solarizedLight');
        expect(src).toBeDefined();
        expect(src).toContain('@theme solarizedLight');
        expect(src).toContain('--bg: #fdf6e3');
        expect(src).toContain('--surface: #eee8d5');
        expect(src).toContain('--text: #657b83');
        expect(src).toContain('--primary: #268bd2');
        expect(src).toContain('--border-focus: #268bd2');
    });

    it('everforest theme exposes correct Everforest base hex colors', () => {
        const src = getBuiltinTheme('everforest');
        expect(src).toBeDefined();
        expect(src).toContain('@theme everforest');
        expect(src).toContain('#a7c080');
        expect(src).toContain('#2d353b');
        expect(src).toContain('#e67e80');
    });

    it('rose-pine theme exposes correct Rosé Pine base hex colors', () => {
        const src = getBuiltinTheme('rose-pine');
        expect(src).toBeDefined();
        expect(src).toContain('@theme rose-pine');
        expect(src).toContain('#c4a7e7');
        expect(src).toContain('#191724');
        expect(src).toContain('#eb6f92');
    });
});
