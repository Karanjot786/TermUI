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

    it('home moves to first enabled item', () => {
        const menu = new Menu({ items });
        const screen = new Screen(20, 5);
        menu.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        // Move down twice to land on 'Exit' (skipping disabled 'Save')
        menu.handleKey(mockKeyEvent('down'));
        menu.handleKey(mockKeyEvent('down'));
        menu.render(screen);
        expect(screen.back[3].some(c => c.bg?.name === 'cyan')).toBe(true);

        // Press Home -> should jump to 'New' (index 0)
        menu.handleKey(mockKeyEvent('home'));
        menu.render(screen);
        expect(screen.back[0].some(c => c.bg?.name === 'cyan')).toBe(true);
    });

    it('end moves to last enabled item (skips disabled)', () => {
        const menu = new Menu({ items });
        const screen = new Screen(20, 5);
        menu.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        // Press End -> should land on 'Exit' (last enabled)
        menu.handleKey(mockKeyEvent('end'));
        menu.render(screen);
        expect(screen.back[3].some(c => c.bg?.name === 'cyan')).toBe(true);
    });

    it('home/end are no-ops when already at extremes', () => {
        const menu = new Menu({ items });

        // At start (first enabled) Home should be a no-op
        const spy = vi.spyOn(menu, 'markDirty');
        menu.handleKey(mockKeyEvent('home'));
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();

        // Move to end, then End again should be a no-op
        menu.handleKey(mockKeyEvent('end'));
        const spy2 = vi.spyOn(menu, 'markDirty');
        menu.handleKey(mockKeyEvent('end'));
        expect(spy2).not.toHaveBeenCalled();
        spy2.mockRestore();
    });

    it('end skips disabled items when computing last', () => {
        const items2: MenuItem[] = [
            { label: 'A', onSelect: vi.fn() },
            { label: 'B', disabled: true },
            { label: 'C', onSelect: vi.fn() },
            { label: 'D', disabled: true },
        ];
        const menu = new Menu({ items: items2 });
        const screen = new Screen(20, 5);
        menu.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        menu.handleKey(mockKeyEvent('end'));
        menu.render(screen);
        // Last enabled is 'C' at index 2
        expect(screen.back[2].some(c => c.bg?.name === 'cyan')).toBe(true);
    });
});
