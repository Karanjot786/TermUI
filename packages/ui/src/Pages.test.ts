// @termuijs/ui - Tests for Pages component

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Pages } from './Pages.js';
import { Box } from '@termuijs/widgets';
import { Screen } from '@termuijs/core';

describe('Pages', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

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

    // ========== 1. Constructor Initialization ==========
    it('constructor: stores pages correctly and auto-activates first page', () => {
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

    it('constructor: adds all page widgets as children', () => {
        const home = new Box();
        const settings = new Box();
        const profile = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
            { name: 'profile', content: profile },
        ]);

        expect(pages.children.length).toBe(3);
        expect(pages.children).toContain(home);
        expect(pages.children).toContain(settings);
        expect(pages.children).toContain(profile);
    });

    // ========== 2. Empty Pages Collection ==========
    it('empty pages: does not throw and activePage is undefined', () => {
        expect(() => new Pages([])).not.toThrow();
        const pages = new Pages([]);
        expect(pages.activePage).toBeUndefined();
    });

    it('empty pages: has no children', () => {
        const pages = new Pages([]);
        expect(pages.children.length).toBe(0);
    });

    it('empty pages: renders safely', () => {
        const pages = new Pages([]);
        const screen = new Screen(40, 10);
        pages.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        expect(() => pages.render(screen)).not.toThrow();
    });

    // ========== 3. Child Registration ==========
    it('child registration: every page content widget is added as a child', () => {
        const page1 = new Box();
        const page2 = new Box();
        const page3 = new Box();
        const pages = new Pages([
            { name: 'page1', content: page1 },
            { name: 'page2', content: page2 },
            { name: 'page3', content: page3 },
        ]);

        expect(pages.children).toContain(page1);
        expect(pages.children).toContain(page2);
        expect(pages.children).toContain(page3);
    });

    it('child registration: child count matches page count', () => {
        const pages = new Pages([
            { name: 'a', content: new Box() },
            { name: 'b', content: new Box() },
            { name: 'c', content: new Box() },
        ]);

        expect(pages.children.length).toBe(3);
    });

    it('child registration: children remain accessible after page switches', () => {
        const home = new Box();
        const settings = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
        ]);

        pages.switchTo('settings');

        expect(pages.children).toContain(home);
        expect(pages.children).toContain(settings);
        expect(pages.children.length).toBe(2);
    });

    // ========== 4. switchTo() Behavior ==========
    it('switchTo: changes active page', () => {
        const home = new Box();
        const settings = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
        ]);

        pages.switchTo('settings');

        expect(pages.activePage).toBe('settings');
        expect(settings.style.visible).toBe(true);
        expect(home.style.visible).toBe(false);
    });

    it('switchTo: switching repeatedly works correctly', () => {
        const home = new Box();
        const settings = new Box();
        const profile = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
            { name: 'profile', content: profile },
        ]);

        pages.switchTo('settings');
        expect(pages.activePage).toBe('settings');

        pages.switchTo('profile');
        expect(pages.activePage).toBe('profile');

        pages.switchTo('home');
        expect(pages.activePage).toBe('home');

        expect(home.style.visible).toBe(true);
        expect(settings.style.visible).toBe(false);
        expect(profile.style.visible).toBe(false);
    });

    it('switchTo: switching back to previous page restores state', () => {
        const home = new Box();
        const settings = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
        ]);

        pages.switchTo('settings');
        pages.switchTo('home');

        expect(pages.activePage).toBe('home');
        expect(home.style.visible).toBe(true);
        expect(settings.style.visible).toBe(false);
    });

    // ========== 5. Invalid Page Names ==========
    it('invalid page names: does not throw on missing page', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);

        expect(() => pages.switchTo('missing')).not.toThrow();
    });

    it('invalid page names: active page remains unchanged', () => {
        const home = new Box();
        const pages = new Pages([{ name: 'home', content: home }]);

        pages.switchTo('missing');

        expect(pages.activePage).toBe('home');
    });

    it('invalid page names: visibility remains unchanged', () => {
        const home = new Box();
        const pages = new Pages([{ name: 'home', content: home }]);

        pages.switchTo('missing');

        expect(home.style.visible).toBe(true);
    });

    it('invalid page names: does not call markDirty', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);
        const spy = vi.spyOn(pages as any, 'markDirty');

        pages.switchTo('missing');

        expect(spy).not.toHaveBeenCalled();
    });

    // ========== 6. Switching To Current Page ==========
    it('switching to current page: active page remains unchanged', () => {
        const home = new Box();
        const pages = new Pages([{ name: 'home', content: home }]);

        pages.switchTo('home');

        expect(pages.activePage).toBe('home');
    });

    it('switching to current page: visibility remains unchanged', () => {
        const home = new Box();
        const pages = new Pages([{ name: 'home', content: home }]);

        pages.switchTo('home');

        expect(home.style.visible).toBe(true);
    });

    it('switching to current page: markDirty is not called', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);
        const spy = vi.spyOn(pages as any, 'markDirty');

        pages.switchTo('home');

        expect(spy).not.toHaveBeenCalled();
    });

    // ========== 7. Standard Visibility Rules ==========
    it('visibility rules: only active page is visible', () => {
        const home = new Box();
        const settings = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
        ]);

        expect(home.style.visible).toBe(true);
        expect(settings.style.visible).toBe(false);
    });

    it('visibility rules: switching updates visibility correctly', () => {
        const home = new Box();
        const settings = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
        ]);

        pages.switchTo('settings');

        expect(home.style.visible).toBe(false);
        expect(settings.style.visible).toBe(true);
    });

    it('visibility rules: all inactive pages are hidden', () => {
        const page1 = new Box();
        const page2 = new Box();
        const page3 = new Box();
        const page4 = new Box();
        const pages = new Pages([
            { name: 'page1', content: page1 },
            { name: 'page2', content: page2 },
            { name: 'page3', content: page3 },
            { name: 'page4', content: page4 },
        ]);

        pages.switchTo('page3');

        expect(page1.style.visible).toBe(false);
        expect(page2.style.visible).toBe(false);
        expect(page3.style.visible).toBe(true);
        expect(page4.style.visible).toBe(false);
    });

    // ========== 8. Overlay Pages ==========
    it('overlay: base page remains visible when overlay is active', () => {
        const base = new Box();
        const overlay = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'modal', content: overlay, overlay: true },
        ]);

        pages.switchTo('modal');

        expect(base.style.visible).toBe(true);
        expect(overlay.style.visible).toBe(true);
    });

    it('overlay: overlay page becomes visible', () => {
        const base = new Box();
        const overlay = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'modal', content: overlay, overlay: true },
        ]);

        pages.switchTo('modal');

        expect(overlay.style.visible).toBe(true);
    });

    it('overlay: other pages remain hidden', () => {
        const base = new Box();
        const other = new Box();
        const overlay = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'other', content: other },
            { name: 'modal', content: overlay, overlay: true },
        ]);

        pages.switchTo('modal');

        expect(base.style.visible).toBe(true);
        expect(other.style.visible).toBe(false);
        expect(overlay.style.visible).toBe(true);
    });

    it('overlay: switching back to base hides overlay', () => {
        const base = new Box();
        const overlay = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'modal', content: overlay, overlay: true },
        ]);

        pages.switchTo('modal');
        pages.switchTo('base');

        expect(base.style.visible).toBe(true);
        expect(overlay.style.visible).toBe(false);
    });

    // ========== 9. Multiple Overlay Pages ==========
    it('multiple overlays: activating first overlay shows base + overlay1', () => {
        const base = new Box();
        const modal1 = new Box();
        const modal2 = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'modal1', content: modal1, overlay: true },
            { name: 'modal2', content: modal2, overlay: true },
        ]);

        pages.switchTo('modal1');

        expect(base.style.visible).toBe(true);
        expect(modal1.style.visible).toBe(true);
        expect(modal2.style.visible).toBe(false);
    });

    it('multiple overlays: activating second overlay shows base + overlay2', () => {
        const base = new Box();
        const modal1 = new Box();
        const modal2 = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'modal1', content: modal1, overlay: true },
            { name: 'modal2', content: modal2, overlay: true },
        ]);

        pages.switchTo('modal2');

        expect(base.style.visible).toBe(true);
        expect(modal1.style.visible).toBe(false);
        expect(modal2.style.visible).toBe(true);
    });

    it('multiple overlays: only one overlay is active at a time', () => {
        const base = new Box();
        const modal1 = new Box();
        const modal2 = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'modal1', content: modal1, overlay: true },
            { name: 'modal2', content: modal2, overlay: true },
        ]);

        pages.switchTo('modal1');
        expect(modal1.style.visible).toBe(true);
        expect(modal2.style.visible).toBe(false);

        pages.switchTo('modal2');
        expect(modal1.style.visible).toBe(false);
        expect(modal2.style.visible).toBe(true);
    });

    // ========== 10. Overlay First Page Edge Case ==========
    it('overlay first page: page remains visible and renders correctly', () => {
        const modal = new Box();
        const pages = new Pages([
            { name: 'modal', content: modal, overlay: true },
        ]);

        expect(pages.activePage).toBe('modal');
        expect(modal.style.visible).toBe(true);
    });

    it('overlay first page: rendering is stable', () => {
        const modal = new Box();
        const pages = new Pages([
            { name: 'modal', content: modal, overlay: true },
        ]);

        const screen = new Screen(40, 10);
        pages.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        expect(() => pages.render(screen)).not.toThrow();
        pages.render(screen);
        expect(() => pages.render(screen)).not.toThrow();
    });

    // ========== 11. markDirty() Behavior ==========
    it('markDirty: called when switching pages', () => {
        const home = new Box();
        const settings = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
        ]);
        const spy = vi.spyOn(pages as any, 'markDirty');

        pages.switchTo('settings');

        expect(spy).toHaveBeenCalled();
    });

    it('markDirty: called exactly once per successful switch', () => {
        const home = new Box();
        const settings = new Box();
        const profile = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
            { name: 'profile', content: profile },
        ]);
        const spy = vi.spyOn(pages as any, 'markDirty');

        pages.switchTo('settings');
        expect(spy).toHaveBeenCalledTimes(1);

        pages.switchTo('profile');
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('markDirty: not called for invalid page names', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);
        const spy = vi.spyOn(pages as any, 'markDirty');

        pages.switchTo('missing');

        expect(spy).not.toHaveBeenCalled();
    });

    it('markDirty: not called when switching to already-active page', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);
        const spy = vi.spyOn(pages as any, 'markDirty');

        pages.switchTo('home');

        expect(spy).not.toHaveBeenCalled();
    });

    // ========== 12. Visibility Consistency ==========
    it('visibility consistency: multiple transitions maintain correct state', () => {
        const home = new Box();
        const settings = new Box();
        const profile = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
            { name: 'profile', content: profile },
        ]);

        pages.switchTo('settings');
        expect(settings.style.visible).toBe(true);
        expect(home.style.visible).toBe(false);
        expect(profile.style.visible).toBe(false);

        pages.switchTo('profile');
        expect(profile.style.visible).toBe(true);
        expect(home.style.visible).toBe(false);
        expect(settings.style.visible).toBe(false);

        pages.switchTo('home');
        expect(home.style.visible).toBe(true);
        expect(settings.style.visible).toBe(false);
        expect(profile.style.visible).toBe(false);
    });

    it('visibility consistency: overlay rules remain correct across transitions', () => {
        const base = new Box();
        const other = new Box();
        const overlay = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'other', content: other },
            { name: 'modal', content: overlay, overlay: true },
        ]);

        pages.switchTo('modal');
        expect(base.style.visible).toBe(true);
        expect(overlay.style.visible).toBe(true);
        expect(other.style.visible).toBe(false);

        pages.switchTo('other');
        expect(other.style.visible).toBe(true);
        expect(overlay.style.visible).toBe(false);
        expect(base.style.visible).toBe(false);

        pages.switchTo('modal');
        expect(base.style.visible).toBe(true);
        expect(overlay.style.visible).toBe(true);
        expect(other.style.visible).toBe(false);
    });

    // ========== 13. Style Propagation ==========
    it('style propagation: constructor options merge correctly', () => {
        const pages = new Pages([], {
            style: {
                flexGrow: 2,
            },
        });

        expect(pages.style.flexGrow).toBe(2);
    });

    it('style propagation: widget retains provided styling', () => {
        const pages = new Pages(
            [
                { name: 'home', content: new Box() },
                { name: 'settings', content: new Box() },
            ],
            {
                style: {
                    flexGrow: 3,
                    padding: 1,
                },
            }
        );

        expect(pages.style.flexGrow).toBe(3);
        expect(pages.style.padding).toBe(1);
    });

    // ========== 14. Rendering Safety ==========
    it('rendering: does not throw with empty pages', () => {
        const pages = new Pages([]);
        const screen = new Screen(40, 10);
        pages.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        expect(() => pages.render(screen)).not.toThrow();
    });

    it('rendering: does not throw with single page', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);
        const screen = new Screen(40, 10);
        pages.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        expect(() => pages.render(screen)).not.toThrow();
    });

    it('rendering: does not throw with multiple pages', () => {
        const pages = new Pages([
            { name: 'home', content: new Box() },
            { name: 'settings', content: new Box() },
            { name: 'profile', content: new Box() },
        ]);
        const screen = new Screen(40, 10);
        pages.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        expect(() => pages.render(screen)).not.toThrow();
    });

    it('rendering: does not throw with overlay page active', () => {
        const base = new Box();
        const overlay = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'modal', content: overlay, overlay: true },
        ]);
        pages.switchTo('modal');

        const screen = new Screen(40, 10);
        pages.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        expect(() => pages.render(screen)).not.toThrow();
    });

    it('rendering: does not throw with width = 0', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);
        const screen = new Screen(0, 10);
        pages.updateRect({ x: 0, y: 0, width: 0, height: 10 });

        expect(() => pages.render(screen)).not.toThrow();
    });

    it('rendering: does not throw with height = 0', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);
        const screen = new Screen(40, 0);
        pages.updateRect({ x: 0, y: 0, width: 40, height: 0 });

        expect(() => pages.render(screen)).not.toThrow();
    });

    it('rendering: does not throw with zero dimensions', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);
        const screen = new Screen(0, 0);
        pages.updateRect({ x: 0, y: 0, width: 0, height: 0 });

        expect(() => pages.render(screen)).not.toThrow();
    });

    // ========== 15. Active Page Getter ==========
    it('activePage getter: returns current active page', () => {
        const pages = new Pages([
            { name: 'home', content: new Box() },
            { name: 'settings', content: new Box() },
        ]);

        expect(pages.activePage).toBe('home');
    });

    it('activePage getter: returns updated page after switching', () => {
        const pages = new Pages([
            { name: 'home', content: new Box() },
            { name: 'settings', content: new Box() },
        ]);

        pages.switchTo('settings');

        expect(pages.activePage).toBe('settings');
    });

    it('activePage getter: returns undefined for empty page collection', () => {
        const pages = new Pages([]);

        expect(pages.activePage).toBeUndefined();
    });

    // ========== 16. Robustness Tests ==========
    it('robustness: handles many page switches', () => {
        const pages = new Pages([
            { name: 'a', content: new Box() },
            { name: 'b', content: new Box() },
            { name: 'c', content: new Box() },
        ]);

        for (let i = 0; i < 100; i++) {
            pages.switchTo('a');
            pages.switchTo('b');
            pages.switchTo('c');
        }

        expect(pages.activePage).toBe('c');
    });

    it('robustness: switchTo with empty string does not crash', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);

        expect(() => pages.switchTo('')).not.toThrow();
        expect(pages.activePage).toBe('home');
    });

    it('robustness: switchTo with whitespace does not crash', () => {
        const pages = new Pages([{ name: 'home', content: new Box() }]);

        expect(() => pages.switchTo('   ')).not.toThrow();
        expect(pages.activePage).toBe('home');
    });

    it('robustness: switchTo on empty pages instance does not crash', () => {
        const pages = new Pages([]);

        expect(() => pages.switchTo('any')).not.toThrow();
        expect(pages.activePage).toBeUndefined();
    });

    it('robustness: activating overlay pages repeatedly works', () => {
        const base = new Box();
        const modal = new Box();
        const pages = new Pages([
            { name: 'base', content: base },
            { name: 'modal', content: modal, overlay: true },
        ]);

        for (let i = 0; i < 50; i++) {
            pages.switchTo('modal');
            pages.switchTo('base');
        }

        expect(pages.activePage).toBe('base');
        expect(base.style.visible).toBe(true);
        expect(modal.style.visible).toBe(false);
    });

    it('robustness: rendering after repeated page switches', () => {
        const home = new Box();
        const settings = new Box();
        const pages = new Pages([
            { name: 'home', content: home },
            { name: 'settings', content: settings },
        ]);

        for (let i = 0; i < 20; i++) {
            pages.switchTo('home');
            pages.switchTo('settings');
        }

        const screen = new Screen(40, 10);
        pages.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        expect(() => pages.render(screen)).not.toThrow();
    });
});
