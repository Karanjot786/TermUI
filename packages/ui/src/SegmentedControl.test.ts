import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { SegmentedControl } from './SegmentedControl.js';

describe('SegmentedControl', () => {
    it('renders options', () => {
        const control = new SegmentedControl({
            options: ['One', 'Two', 'Three'],
        });

        control.updateRect({
            x: 0,
            y: 0,
            width: 50,
            height: 1,
        });

        const screen = new Screen(50, 1);

        control.render(screen);

        const rendered = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');

        expect(rendered).toContain('One');
        expect(rendered).toContain('Two');
        expect(rendered).toContain('Three');
    });

    it('moves right and fires onChange', () => {
        const onChange = vi.fn();

        const control = new SegmentedControl({
            options: ['One', 'Two', 'Three'],
            value: 'One',
            onChange,
        });

        control.handleKey({
            key: 'right',
            ctrl: false,
            alt: false,
        } as any);

        expect(control.value).toBe('Two');
        expect(onChange).toHaveBeenCalledWith('Two');
    });

    it('moves left and fires onChange', () => {
        const onChange = vi.fn();

        const control = new SegmentedControl({
            options: ['One', 'Two', 'Three'],
            value: 'Two',
            onChange,
        });

        control.handleKey({
            key: 'left',
            ctrl: false,
            alt: false,
        } as any);

        expect(control.value).toBe('One');
        expect(onChange).toHaveBeenCalledWith('One');
    });

    it('marks dirty when selection changes', () => {
        const control = new SegmentedControl({
            options: ['One', 'Two'],
        });

        const spy = vi.spyOn(control as any, 'markDirty');

        control.next();

        expect(spy).toHaveBeenCalled();
    });
});