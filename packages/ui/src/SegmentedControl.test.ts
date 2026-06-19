import { describe, it, expect, vi } from 'vitest';
import { Screen, createKeyEvent } from '@termuijs/core';
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

        control.handleKey(createKeyEvent({ key: 'right', ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0) }));

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

        control.handleKey(createKeyEvent({ key: 'left', ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0) }));

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

    it('home moves to first option and fires onChange', () => {
        const onChange = vi.fn();
        const control = new SegmentedControl({
            options: ['One', 'Two', 'Three'],
            value: 'Two',
            onChange,
        });

        control.handleKey(createKeyEvent({ key: 'home', ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0) }));

        expect(control.value).toBe('One');
        expect(onChange).toHaveBeenCalledWith('One');
    });

    it('end moves to last option and fires onChange', () => {
        const onChange = vi.fn();
        const control = new SegmentedControl({
            options: ['One', 'Two', 'Three'],
            value: 'Two',
            onChange,
        });

        control.handleKey(createKeyEvent({ key: 'end', ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0) }));

        expect(control.value).toBe('Three');
        expect(onChange).toHaveBeenCalledWith('Three');
    });
});
