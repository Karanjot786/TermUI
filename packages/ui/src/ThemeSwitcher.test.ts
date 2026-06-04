// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for ThemeSwitcher component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { ThemeSwitcher } from './ThemeSwitcher.js';

function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char ?? ' ').join('').trim();
}

function renderSwitcher(ts: ThemeSwitcher): Screen {
    const themes = ts.themes;
    const screen = new Screen(20, themes.length + 2);
    ts.updateRect({ x: 0, y: 0, width: 20, height: themes.length + 2 });
    ts.render(screen);
    return screen;
}

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

    it('syncs activeTheme to first theme when provided activeTheme is not in list', () => {
        const ts = new ThemeSwitcher({ themes: ['light', 'dark'], activeTheme: 'invalid' });
        expect(ts.selectedIndex).toBe(0);
        expect(ts.activeTheme).toBe('light');
    });

    it('renders theme names in output', () => {
        const ts = new ThemeSwitcher({ themes: ['light', 'dark'] });
        const screen = renderSwitcher(ts);
        const row0 = rowText(screen, 1);
        const row1 = rowText(screen, 2);
        expect(row0).toContain('Light');
        expect(row1).toContain('Dark');
    });

    it('renders selection marker on the selected row', () => {
        const ts = new ThemeSwitcher({ themes: ['light', 'dark'] });
        ts.selectNext();
        const screen = renderSwitcher(ts);
        const row1 = rowText(screen, 2);
        expect(row1).toMatch(/[>▸]/);
    });

    it('renders active marker after confirm', () => {
        const ts = new ThemeSwitcher({ themes: ['light', 'dark'] });
        ts.selectNext();
        ts.confirm();
        const screen = renderSwitcher(ts);
        const row1 = rowText(screen, 2);
        expect(row1).toMatch(/[*●]/);
    });

    it('applies bold and custom/active color styling to selected and active items', () => {
        const ts = new ThemeSwitcher({ 
            themes: ['light', 'dark'], 
            activeTheme: 'light',
            activeColor: { type: 'named', name: 'green' } 
        });
        const screen = renderSwitcher(ts);

        // 'light' (active and selected) should have bold styling and green foreground color
        expect(screen.back[1][1].bold).toBe(true);
        expect(screen.back[1][1].fg).toEqual({ type: 'named', name: 'green' });

        // 'dark' (neither active nor selected) should not be bold and not green
        expect(screen.back[2][1].bold).toBe(false);
        expect(screen.back[2][1].fg).not.toEqual({ type: 'named', name: 'green' });
    });

    it('uses unicode markers when caps.unicode is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const ts = new ThemeSwitcher({ themes: ['light', 'dark'] });
        const screen = renderSwitcher(ts);
        
        const row1 = rowText(screen, 1);
        expect(row1).toContain('●▸ Light');
        
        vi.restoreAllMocks();
    });

    it('uses ASCII markers when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const ts = new ThemeSwitcher({ themes: ['light', 'dark'] });
        const screen = renderSwitcher(ts);
        
        const row1 = rowText(screen, 1);
        expect(row1).toContain('*> Light');
        
        vi.restoreAllMocks();
    });
});
