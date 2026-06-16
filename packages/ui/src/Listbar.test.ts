import { describe, it, expect, vi } from 'vitest';
import { type KeyEvent, createKeyEvent, Screen } from '@termuijs/core';
import { Listbar } from './Listbar.js';

function makeKey(key: string): KeyEvent {
    return createKeyEvent({ key, raw: Buffer.alloc(0), ctrl: false, alt: false, shift: false });
}

describe('Listbar', () => {
    it('renders all labels in a single row', () => {
        const listbar = new Listbar([
            { label: 'Save', key: 'F1' },
            { label: 'Load', key: 'F2' },
            { label: 'Quit', key: 'F3' },
        ]);

        listbar.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        listbar.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('Save');
        expect(row0).toContain('Load');
        expect(row0).toContain('Quit');
    });

    it('right key moves active item', () => {
        const actions = [vi.fn(), vi.fn(), vi.fn()];
        const listbar = new Listbar([
            { label: 'A', action: actions[0] },
            { label: 'B', action: actions[1] },
            { label: 'C', action: actions[2] },
        ]);

        expect(listbar.activeItem).toBe(0);

        listbar.handleKey(makeKey('right'));
        expect(listbar.activeItem).toBe(1);

        listbar.handleKey(makeKey('right'));
        expect(listbar.activeItem).toBe(2);

        listbar.handleKey(makeKey('right'));
        expect(listbar.activeItem).toBe(0);
    });

    it('left key moves active item', () => {
        const listbar = new Listbar([
            { label: 'A' },
            { label: 'B' },
            { label: 'C' },
        ]);

        listbar.handleKey(makeKey('left'));
        expect(listbar.activeItem).toBe(2);

        listbar.handleKey(makeKey('left'));
        expect(listbar.activeItem).toBe(1);
    });

    it('enter fires action of active item', () => {
        const action = vi.fn();
        const listbar = new Listbar([
            { label: 'Save', action },
            { label: 'Load' },
        ]);

        listbar.handleKey(makeKey('enter'));
        expect(action).toHaveBeenCalledTimes(1);
    });

    it('disabled items are skipped', () => {
        const actions = [vi.fn(), vi.fn(), vi.fn()];
        const listbar = new Listbar([
            { label: 'A', action: actions[0] },
            { label: 'B', action: actions[1], disabled: true },
            { label: 'C', action: actions[2] },
        ]);

        expect(listbar.activeItem).toBe(0);

        listbar.handleKey(makeKey('right'));
        expect(listbar.activeItem).toBe(2);

        listbar.handleKey(makeKey('left'));
        expect(listbar.activeItem).toBe(0);
    });

    it('enter does not fire action on disabled item', () => {
        const action = vi.fn();
        const listbar = new Listbar([
            { label: 'A', action: action, disabled: true },
        ]);

        listbar.handleKey(makeKey('enter'));
        expect(action).not.toHaveBeenCalled();
    });

    it('setItems updates items and resets active index', () => {
        const listbar = new Listbar([
            { label: 'A' },
            { label: 'B' },
        ]);

        listbar.handleKey(makeKey('right'));
        expect(listbar.activeItem).toBe(1);

        listbar.setItems([
            { label: 'X' },
            { label: 'Y' },
            { label: 'Z' },
        ]);

        expect(listbar.activeItem).toBe(0);
    });

    it('renders separator between items', () => {
        const listbar = new Listbar([
            { label: 'Save' },
            { label: 'Load' },
        ]);

        listbar.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        listbar.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('|');
    });

    it('renders key hints in the output', () => {
        const listbar = new Listbar([
            { label: 'Save', key: 'F1' },
        ]);

        listbar.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        listbar.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('F1');
        expect(row0).toContain('Save');
    });
});
