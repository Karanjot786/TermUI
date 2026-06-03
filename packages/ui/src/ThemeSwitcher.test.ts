// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for ThemeSwitcher component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { ThemeSwitcher } from './ThemeSwitcher.js';

describe('ThemeSwitcher', () => {
    it('initializes with activeTheme="default" and correct selectedIndex', () => {
        const ts = new ThemeSwitcher();
        expect(ts.activeTheme).toBe('default');
        expect(ts.selectedIndex).toBe(0);
    });

    it('custom themes lists are supported', () => {
        const themes = ['light', 'dark'];
        const ts = new ThemeSwitcher({ themes, activeTheme: 'dark' });
        expect(ts.themes).toEqual(themes);
        expect(ts.activeTheme).toBe('dark');
        expect(ts.selectedIndex).toBe(1);
    });

    it('selectNext increments selectedIndex', () => {
        const ts = new ThemeSwitcher();
        ts.selectNext();
        expect(ts.selectedIndex).toBe(1);
    });

    it('selectPrev decrements selectedIndex', () => {
        const ts = new ThemeSwitcher();
        ts.selectNext();
        ts.selectPrev();
        expect(ts.selectedIndex).toBe(0);
    });

    it('selectNext at last stays at last', () => {
        const ts = new ThemeSwitcher({ themes: ['a', 'b'] });
        ts.selectNext(); // 1
        ts.selectNext(); // stays at 1
        expect(ts.selectedIndex).toBe(1);
    });

    it('confirm calls onChange callback with selected theme', () => {
        const onChange = vi.fn();
        const ts = new ThemeSwitcher({ onChange });
        ts.selectNext(); // select second theme
        ts.confirm();
        expect(onChange).toHaveBeenCalledWith(ts.themes[1]);
        expect(ts.activeTheme).toBe(ts.themes[1]);
    });
});
