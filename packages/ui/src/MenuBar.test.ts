import { describe, it, expect, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { MenuBar } from './MenuBar.js';

const makeMenus = (action1 = vi.fn(), action2 = vi.fn()) => [
    {
        label: 'File',
        items: [
            { label: 'New', action: action1 },
            { label: 'Open', disabled: true },
            { label: 'Save', action: action2 },
        ],
    },
    {
        label: 'Edit',
        items: [
            { label: 'Copy' },
            { label: 'Paste' },
        ],
    },
];

describe('MenuBar', () => {
    it('initializes in correct state', () => {
        const mb = new MenuBar(makeMenus());
        expect(mb.activeMenu).toBe(0);
        expect(mb.isOpen).toBe(false);
        expect(mb.activeItem).toBe(-1);
    });

    it('all menu labels render on row 0', () => {
        const mb = new MenuBar(makeMenus());
        mb.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        const screen = new Screen(40, 5);
        mb.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('File');
        expect(row0).toContain('Edit');
    });

    it('right key moves active menu', () => {
        const mb = new MenuBar(makeMenus());
        mb.handleKey({ key: 'right' } as any);
        expect(mb.activeMenu).toBe(1);

        mb.handleKey({ key: 'right' } as any);
        expect(mb.activeMenu).toBe(0); // wraps around

        mb.handleKey({ key: 'left' } as any);
        expect(mb.activeMenu).toBe(1); // wraps around left
    });

    it('enter opens dropdown', () => {
        const mb = new MenuBar(makeMenus());
        mb.handleKey({ key: 'enter' } as any);
        expect(mb.isOpen).toBe(true);
        expect(mb.activeItem).toBe(0); // first enabled item (New)
    });

    it('down key moves item selection in dropdown', () => {
        const mb = new MenuBar(makeMenus());
        mb.handleKey({ key: 'enter' } as any); // Open
        expect(mb.activeItem).toBe(0); // New

        mb.handleKey({ key: 'down' } as any);
        expect(mb.activeItem).toBe(2); // Skips Open (disabled) and goes to Save

        mb.handleKey({ key: 'down' } as any);
        expect(mb.activeItem).toBe(0); // Wraps around to New
    });

    it('enter fires action and closes dropdown', () => {
        const action1 = vi.fn();
        const action2 = vi.fn();
        const mb = new MenuBar(makeMenus(action1, action2));

        mb.handleKey({ key: 'enter' } as any); // Open, activeItem is 0 (New)
        mb.handleKey({ key: 'down' } as any); // activeItem is 2 (Save)
        mb.handleKey({ key: 'enter' } as any); // Trigger Save

        expect(action2).toHaveBeenCalledTimes(1);
        expect(action1).not.toHaveBeenCalled();
        expect(mb.isOpen).toBe(false);
    });

    it('escape closes dropdown', () => {
        const mb = new MenuBar(makeMenus());
        mb.handleKey({ key: 'enter' } as any); // Open
        expect(mb.isOpen).toBe(true);

        mb.handleKey({ key: 'escape' } as any); // Close
        expect(mb.isOpen).toBe(false);
    });

    it('renders with unicode caps', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const mb = new MenuBar(makeMenus());
        mb.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        const screen = new Screen(40, 5);

        mb.handleKey({ key: 'enter' } as any); // open
        mb.render(screen);

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('● New');
    });

    it('renders with non-unicode caps (fallback)', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const mb = new MenuBar(makeMenus());
        mb.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        const screen = new Screen(40, 5);

        mb.handleKey({ key: 'enter' } as any); // open
        mb.render(screen);

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('* New');
    });
});
