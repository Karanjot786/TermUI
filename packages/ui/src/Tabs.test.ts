// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Tabs component
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Tabs } from './Tabs.js';
import { Box } from '@termuijs/widgets';

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
});
