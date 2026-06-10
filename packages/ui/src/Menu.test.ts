import { describe, it, expect, vi } from 'vitest';
import { Screen, createKeyEvent } from '@termuijs/core';
import { Menu, type MenuItem } from './Menu.js';

function mockKeyEvent(key: string) {
    return createKeyEvent({
        key,
        raw: Buffer.from([]),
        ctrl: false,
        alt: false,
        shift: false
    });
}

describe('Menu', () => {
    const items: MenuItem[] = [
        { label: 'New', onSelect: vi.fn() },
        { label: 'Open', onSelect: vi.fn() },
        { label: 'Save', disabled: true },
        { label: 'Exit', onSelect: vi.fn() },
    ];

    it('initializes selection to the first enabled item', () => {
        const menu = new Menu({ items });
        const screen = new Screen(20, 5);
        menu.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        menu.render(screen);

        // Row 0 ('New') should be highlighted (cyan background)
        const row0 = screen.back[0];
        expect(row0.some(c => c.bg?.name === 'cyan')).toBe(true);
        
        // Row 1 ('Open') should not be highlighted
        const row1 = screen.back[1];
        expect(row1.some(c => c.bg?.name === 'cyan')).toBe(false);
    });

    it('navigates with up/down arrows', () => {
        const menu = new Menu({ items });
        const screen = new Screen(20, 5);
        menu.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        // Initial state: Row 0 selected
        menu.render(screen);
        expect(screen.back[0].some(c => c.bg?.name === 'cyan')).toBe(true);

        // Navigate down — 'Open' row should become highlighted
        menu.handleKey(mockKeyEvent('down'));
        menu.render(screen);
        
        expect(screen.back[1].some(c => c.bg?.name === 'cyan')).toBe(true);
        expect(screen.back[0].some(c => c.bg?.name === 'cyan')).toBe(false);

        // Navigate up — back to 'New'
        menu.handleKey(mockKeyEvent('up'));
        menu.render(screen);
        expect(screen.back[0].some(c => c.bg?.name === 'cyan')).toBe(true);
    });

    it('skips disabled items when navigating', () => {
        const menu = new Menu({ items }); // New (0), Open (1), Save (2, disabled), Exit (3)
        const screen = new Screen(20, 5);
        menu.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        // Start at 'Open' (1)
        menu.handleKey(mockKeyEvent('down'));
        
        // Navigate down — should skip 'Save' (2) and go to 'Exit' (3)
        menu.handleKey(mockKeyEvent('down'));
        menu.render(screen);
        
        expect(screen.back[3].some(c => c.bg?.name === 'cyan')).toBe(true);
        expect(screen.back[2].some(c => c.bg?.name === 'cyan')).toBe(false);
        expect(screen.back[2].some(c => c.char === 'S')).toBe(true); // Verify row 2 is indeed 'Save'
    });

    it('confirms selection with enter', () => {
        const onSelect = vi.fn();
        const testItems: MenuItem[] = [
            { label: 'Test', onSelect }
        ];
        const menu = new Menu({ items: testItems });
        
        menu.handleKey(mockKeyEvent('enter'));
        expect(onSelect).toHaveBeenCalled();
    });

    it('calls onClose when escape is pressed', () => {
        const onClose = vi.fn();
        const menu = new Menu({ items, onClose });
        
        menu.handleKey(mockKeyEvent('escape'));
        expect(onClose).toHaveBeenCalled();
    });
});
