// @termuijs/ui - Tests for Pages component

import { describe, it, expect } from 'vitest';
import { Pages } from './Pages.js';
import { Box } from '@termuijs/widgets';

describe('Pages', () => {
    it('renders initial page correctly', () => {
        const home = new Box();
        const settings = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
        ]);

        expect(pages.activePage).toBe('home');
        expect(home.style.visible).toBe(true);
        expect(settings.style.visible).toBe(false);
    });

    it('switchTo(name) changes the active page', () => {
        const home = new Box();
        const settings = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
        ]);

        pages.switchTo('settings');

        expect(pages.activePage).toBe('settings');
        expect(home.style.visible).toBe(false);
        expect(settings.style.visible).toBe(true);
    });

    it('invalid page names do not crash', () => {
        const home = new Box();
        const pages = new Pages([{ name: 'home', content: home }]);

        expect(() => pages.switchTo('missing')).not.toThrow();
        expect(pages.activePage).toBe('home');
        expect(home.style.visible).toBe(true);
    });

    it('tracks active page and overlay visibility', () => {
        const base = new Box();
        const overlay = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'modal', content: overlay, overlay: true },
        ]);

        pages.switchTo('modal');

        expect(pages.activePage).toBe('modal');
        expect(base.style.visible).toBe(true);
        expect(overlay.style.visible).toBe(true);
    });
});
