// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Tabs component
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Tabs } from './Tabs.js';
import { Box, Text } from '@termuijs/widgets';
import { Screen } from '@termuijs/core';

const makeTabs = () => new Tabs([
    { label: 'Home', content: new Box() },
    { label: 'Settings', content: new Box() },
    { label: 'About', content: new Box() },
]);

describe('Tabs', () => {
    it('starts at tab 0', () => {
        const tabs = makeTabs();
        expect(tabs.activeIndex).toBe(0);
    });

    it('selectTab sets active tab', () => {
        const tabs = makeTabs();
        tabs.selectTab(2);
        expect(tabs.activeIndex).toBe(2);
    });

    it('nextTab cycles forward wrapping around', () => {
        const tabs = makeTabs();
        tabs.nextTab(); // 1
        tabs.nextTab(); // 2
        tabs.nextTab(); // 0 (wraps)
        expect(tabs.activeIndex).toBe(0);
    });

    it('prevTab cycles backward wrapping around', () => {
        const tabs = makeTabs();
        tabs.prevTab(); // wraps to 2
        expect(tabs.activeIndex).toBe(2);
    });

    it('safe with no tabs', () => {
        const tabs = new Tabs([]);
        tabs.selectTab(0);
        tabs.nextTab();
        tabs.nextTab();
        tabs.prevTab();
        tabs.prevTab();
        expect(tabs.activeIndex).toBe(0);
        expect(Number.isFinite(tabs.activeIndex)).toBe(true);
    });

    it('renders active tab content below the tab bar', () => {
        const tabs = new Tabs([
            { label: 'Home', content: new Text('Home Content') },
            { label: 'Settings', content: new Text('Settings Content') },
        ], { border: 'none' });
        const screen = new Screen(40, 10);
        tabs.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        tabs.render(screen);
        const row2 = screen.back[2].map(c => c.char).join('');
        expect(row2).toContain('Home Content');
    });

    it('renders different content after switching tabs', () => {
        const tabs = new Tabs([
            { label: 'Home', content: new Text('Home Content') },
            { label: 'Settings', content: new Text('Settings Content') },
        ], { border: 'none' });
        const screen = new Screen(40, 10);
        tabs.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        tabs.selectTab(1);
        tabs.render(screen);
        const row2 = screen.back[2].map(c => c.char).join('');
        expect(row2).toContain('Settings Content');
        expect(row2).not.toContain('Home Content');
    });

    it('renders content inside content area when border is none', () => {
        const tabs = new Tabs([
            { label: 'One', content: new Text('Visible') },
        ], { border: 'none' });
        const screen = new Screen(20, 5);
        tabs.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        tabs.render(screen);
        const row2 = screen.back[2].map(c => c.char).join('');
        expect(row2).toContain('Visible');
    });

    it('does not crash when content is undefined', () => {
        const tabs = new Tabs([]);
        const screen = new Screen(40, 10);
        tabs.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        expect(() => tabs.render(screen)).not.toThrow();
    });

    it('does not render content when height is too small', () => {
        const content = new Text('Should Not Appear');
        const tabs = new Tabs([
            { label: 'Tiny', content },
        ]);
        const screen = new Screen(20, 2);
        tabs.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        tabs.render(screen);
        const all = screen.back.map(r => r.map(c => c.char).join('')).join('');
        expect(all).not.toContain('Should Not Appear');
    });
});
