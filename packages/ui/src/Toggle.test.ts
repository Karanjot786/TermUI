import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { Toggle } from './Toggle.js';

describe('Toggle', () => {
    it('initial state uses defaultValue', () => {
        const toggle = new Toggle({ defaultValue: true });

        expect(toggle.value).toBe(true);
    });

    it('toggles on space key', () => {
        const toggle = new Toggle({ defaultValue: false });

        toggle.handleKey({
            key: 'space',
            ctrl: false,
            alt: false,
        } as any);

        expect(toggle.value).toBe(true);
    });

    it('renders label correctly', () => {
        const toggle = new Toggle({
            label: 'Auto-save',
            defaultValue: true,
        });

        toggle.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 1,
        });

        const screen = new Screen(30, 1);

        toggle.render(screen);

        const rendered = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');

        expect(rendered).toContain('Auto-save');
        expect(rendered).toContain('[ ON ]');
    });
});