import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { Sidebar } from './Sidebar.js';

describe('Sidebar', () => {
    it('renders item labels', () => {
        const screen = new Screen(30, 5);

        const sidebar = new Sidebar([
            { label: 'Home' }
        ]);

        sidebar.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 5
        });

        sidebar.render(screen);

        const row = screen.back[0].map(c => c.char).join('');

        expect(row).toContain('Home');
    });

    it('renders badge text', () => {
        const screen = new Screen(30, 5);

        const sidebar = new Sidebar([
            { label: 'Inbox', badge: '5' }
        ]);

        sidebar.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 5
        });

        sidebar.render(screen);

        const row = screen.back[0].map(c => c.char).join('');

        expect(row).toContain('[5]');
    });

    it('renders active item indicator', () => {
        const screen = new Screen(30, 5);

        const sidebar = new Sidebar([
            { label: 'Home', active: true }
        ]);

        sidebar.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 5
        });

        sidebar.render(screen);

        const row = screen.back[0].map(c => c.char).join('');

        expect(row).toContain('▶');
    });

    it('renders collapsed mode with first character only', () => {
        const screen = new Screen(30, 5);

        const sidebar = new Sidebar(
            [{ label: 'Home' }],
            {},
            { collapsed: true }
        );

        sidebar.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 5
        });

        sidebar.render(screen);

        const row = screen.back[0].map(c => c.char).join('');

        expect(row).toContain('H');
        expect(row).not.toContain('Home');
    });

    it('toggle updates collapsed state', () => {
        const sidebar = new Sidebar([{ label: 'Home' }]);

        expect(sidebar.isCollapsed).toBe(false);

        sidebar.toggle();

        expect(sidebar.isCollapsed).toBe(true);
    });

    it('setCollapsed updates collapsed state and calls markDirty', () => {
        const sidebar = new Sidebar([{ label: 'Home' }]);

        const spy = vi.spyOn(sidebar, 'markDirty');

        sidebar.setCollapsed(true);

        expect(sidebar.isCollapsed).toBe(true);
        expect(spy).toHaveBeenCalled();
    });

    it('setItems replaces items and calls markDirty', () => {
        const screen = new Screen(30, 5);

        const sidebar = new Sidebar([
            { label: 'Old' }
        ]);

        const spy = vi.spyOn(sidebar, 'markDirty');

        sidebar.setItems([
            { label: 'New' }
        ]);

        expect(spy).toHaveBeenCalled();

        sidebar.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 5
        });

        sidebar.render(screen);

        const row = screen.back[0].map(c => c.char).join('');

        expect(row).toContain('New');
    });

    it('respects height limits', () => {
        const screen = new Screen(30, 1);

        const sidebar = new Sidebar([
            { label: 'One' },
            { label: 'Two' },
            { label: 'Three' }
        ]);

        sidebar.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 1
        });

        sidebar.render(screen);

        const row = screen.back[0].map(c => c.char).join('');

        expect(row).toContain('One');
    });
});