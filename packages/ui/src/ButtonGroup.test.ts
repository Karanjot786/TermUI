import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { ButtonGroup } from './ButtonGroup.js';

describe('ButtonGroup', () => {
    it('renders labels', () => {
        const items = [
            { label: 'One', value: 'one' },
            { label: 'Two', value: 'two' },
            { label: 'Three', value: 'three' },
        ];

        const bg = new ButtonGroup(items);

        bg.updateRect({ x: 0, y: 0, width: 40, height: 1 });

        const screen = new Screen(40, 1);
        bg.render(screen);

        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');

        expect(rendered).toContain('[One]');
        expect(rendered).toContain('[Two]');
        expect(rendered).toContain('[Three]');
    });

    it('navigates left/right and skips disabled items', () => {
        const items = [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b', disabled: true },
            { label: 'C', value: 'c' },
        ];

        const bg = new ButtonGroup(items);

        // initial active is first enabled
        expect(bg.getActiveValue()).toBe('a');

        // move right should skip disabled 'b' and go to 'c'
        bg.handleKey({ key: 'right', ctrl: false, alt: false } as any);
        expect(bg.getActiveValue()).toBe('c');

        // move left should wrap and skip disabled 'b' back to 'a'
        bg.handleKey({ key: 'left', ctrl: false, alt: false } as any);
        expect(bg.getActiveValue()).toBe('a');
    });

    it('calls onSelect on enter', () => {
        const items = [
            { label: 'X', value: 'x' },
            { label: 'Y', value: 'y' },
        ];

        const onSelect = vi.fn();
        const bg = new ButtonGroup(items, {}, { onSelect });

        // ensure active is first
        expect(bg.getActiveValue()).toBe('x');

        bg.handleKey({ key: 'enter', ctrl: false, alt: false } as any);

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith('x');
    });
});
import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { ButtonGroup } from './ButtonGroup.js';

const items = [
    { label: 'One', value: 'one' },
    { label: 'Two', value: 'two' },
    { label: 'Three', value: 'three' },
];

function renderText(buttonGroup: ButtonGroup, width = 40): string {
    const screen = new Screen(width, 1);

    buttonGroup.updateRect({
        x: 0,
        y: 0,
        width,
        height: 1,
    });

    buttonGroup.render(screen);

    return screen.back[0]
        .map((cell) => cell.char)
        .join('');
}

describe('ButtonGroup', () => {
    it('renders all labels in the widget area', () => {
        const buttonGroup = new ButtonGroup(items);
        const rendered = renderText(buttonGroup);

        expect(rendered).toContain('One');
        expect(rendered).toContain('Two');
        expect(rendered).toContain('Three');
    });

    it('right key moves selection to the next item', () => {
        const buttonGroup = new ButtonGroup(items);

        buttonGroup.handleKey({
            key: 'right',
            ctrl: false,
            alt: false,
        });

        expect(buttonGroup.getActiveValue()).toBe('two');
    });

    it('selection wraps at the end', () => {
        const buttonGroup = new ButtonGroup(items);

        buttonGroup.setActiveValue('three');
        buttonGroup.handleKey({
            key: 'right',
            ctrl: false,
            alt: false,
        });

        expect(buttonGroup.getActiveValue()).toBe('one');
    });

    it('enter fires onSelect with the active value', () => {
        const onSelect = vi.fn();
        const buttonGroup = new ButtonGroup(items, {}, { onSelect });

        buttonGroup.setActiveValue('two');
        buttonGroup.handleKey({
            key: 'enter',
            ctrl: false,
            alt: false,
        });

        expect(onSelect).toHaveBeenCalledWith('two');
    });

    it('disabled items are skipped', () => {
        const buttonGroup = new ButtonGroup([
            { label: 'One', value: 'one' },
            { label: 'Two', value: 'two', disabled: true },
            { label: 'Three', value: 'three' },
        ]);

        buttonGroup.handleKey({
            key: 'right',
            ctrl: false,
            alt: false,
        });

        expect(buttonGroup.getActiveValue()).toBe('three');
    });

    it('renders the active item with activeColor', () => {
        const activeColor = { type: 'named' as const, name: 'green' as const };
        const buttonGroup = new ButtonGroup(items, {}, { activeColor });
        const screen = new Screen(40, 1);

        buttonGroup.updateRect({
            x: 0,
            y: 0,
            width: 40,
            height: 1,
        });

        buttonGroup.render(screen);

        expect(screen.back[0][1].fg).toEqual(activeColor);
    });
});
