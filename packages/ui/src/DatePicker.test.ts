import { describe, it, expect, vi } from 'vitest';
import { DatePicker } from './DatePicker.js';
import type { KeyEvent } from '@termuijs/core';

const makeKeyEvent = (key: string): KeyEvent => ({
    key,
    raw: Buffer.alloc(0),
    ctrl: false,
    alt: false,
    shift: false,
    stopPropagation: () => {},
    preventDefault: () => {}
});

describe('DatePicker', () => {
    it('initializes with the correct default value and month', () => {
        const testDate = new Date(2026, 5, 1); // June 1, 2026
        const picker = new DatePicker({ value: testDate });

        expect(picker.value.getFullYear()).toBe(2026);
        expect(picker.value.getMonth()).toBe(5);
        expect(picker.value.getDate()).toBe(1);
        expect(picker.focusable).toBe(true);
    });

    it('navigates days and weeks with arrow keys', () => {
        const testDate = new Date(2026, 5, 15); // June 15, 2026
        const picker = new DatePicker({ value: testDate });

        // Move selection right (+1 day)
        picker.handleKey(makeKeyEvent('right'));
        expect(picker.value.getDate()).toBe(16);

        // Move selection left (-1 day)
        picker.handleKey(makeKeyEvent('left'));
        expect(picker.value.getDate()).toBe(15);

        // Move selection down (+7 days)
        picker.handleKey(makeKeyEvent('down'));
        expect(picker.value.getDate()).toBe(22);

        // Move selection up (-7 days)
        picker.handleKey(makeKeyEvent('up'));
        expect(picker.value.getDate()).toBe(15);
    });

    it('crosses month boundaries automatically during selection movement', () => {
        const testDate = new Date(2026, 5, 1); // June 1, 2026
        const picker = new DatePicker({ value: testDate });

        // Move selection left (-1 day) -> Should go to May 31, 2026
        picker.handleKey(makeKeyEvent('left'));
        expect(picker.value.getFullYear()).toBe(2026);
        expect(picker.value.getMonth()).toBe(4); // May is 4
        expect(picker.value.getDate()).toBe(31);
    });

    it('navigates months with PageUp and PageDown', () => {
        const testDate = new Date(2026, 5, 15); // June 15, 2026
        const picker = new DatePicker({ value: testDate });

        // PageDown shifts +1 month (July)
        picker.handleKey(makeKeyEvent('pagedown'));
        expect(picker.value.getMonth()).toBe(6); // July is 6

        // PageUp shifts -1 month (June)
        picker.handleKey(makeKeyEvent('pageup'));
        expect(picker.value.getMonth()).toBe(5); // June is 5
    });

    it('confirms the date and calls onChange when Enter is pressed', () => {
        const testDate = new Date(2026, 5, 15);
        const onChange = vi.fn();
        const picker = new DatePicker({ value: testDate, onChange });

        // Move selection and confirm
        picker.handleKey(makeKeyEvent('right')); // June 16
        picker.handleKey(makeKeyEvent('enter'));

        expect(onChange).toHaveBeenCalledTimes(1);
        const arg = onChange.mock.calls[0][0];
        expect(arg.getFullYear()).toBe(2026);
        expect(arg.getMonth()).toBe(5);
        expect(arg.getDate()).toBe(16);
    });

    it('clamps day when changing to a shorter month', () => {
        const testDate = new Date(2026, 0, 31); // Jan 31, 2026
        const picker = new DatePicker({ value: testDate });

        // Jan 31 + pagedown -> Feb: Feb has 28 days, should clamp to Feb 28
        picker.handleKey(makeKeyEvent('pagedown'));
        expect(picker.value.getMonth()).toBe(1); // February
        expect(picker.value.getDate()).toBe(28); // clamped, not rolled to Mar 3
    });
});
