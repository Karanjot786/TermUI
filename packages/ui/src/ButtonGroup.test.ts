import { describe, it, expect, vi } from 'vitest';
import { Screen, type KeyEvent } from '@termuijs/core';
import { ButtonGroup } from './ButtonGroup.js';

function makeKey(key: string): KeyEvent {
    return {
        key,
        shift: false,
        ctrl: false,
        alt: false,
        raw: Buffer.alloc(0),
        stopPropagation: () => {},
        preventDefault: () => {},
    };
}

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

        buttonGroup.handleKey(makeKey('right'));

        expect(buttonGroup.getActiveValue()).toBe('two');
    });

    it('selection wraps at the end', () => {
        const buttonGroup = new ButtonGroup(items);

        buttonGroup.setActiveValue('three');
        buttonGroup.handleKey(makeKey('right'));

        expect(buttonGroup.getActiveValue()).toBe('one');
    });

    it('enter fires onSelect with the active value', () => {
        const onSelect = vi.fn();
        const buttonGroup = new ButtonGroup(items, {}, { onSelect });

        buttonGroup.setActiveValue('two');
        buttonGroup.handleKey(makeKey('enter'));

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith('two');
    });

    it('disabled items are skipped', () => {
        const buttonGroup = new ButtonGroup([
            { label: 'One', value: 'one' },
            { label: 'Two', value: 'two', disabled: true },
            { label: 'Three', value: 'three' },
        ]);

        buttonGroup.handleKey(makeKey('right'));

        expect(buttonGroup.getActiveValue()).toBe('three');
    });
});
