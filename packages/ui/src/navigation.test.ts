import { describe, expect, it } from 'vitest';
import {
    firstEnabledIndex,
    lastEnabledIndex,
    nextEnabledIndex,
    previousEnabledIndex,
} from './navigation.js';

interface DemoItem {
    label: string;
    disabled?: boolean;
}

const items: DemoItem[] = [
    { label: 'A' },
    { label: 'B', disabled: true },
    { label: 'C' },
    { label: 'D' },
];

describe('navigation helpers', () => {
    it('finds the first enabled index', () => {
        expect(firstEnabledIndex(items, item => !!item.disabled)).toBe(0);
    });

    it('finds the last enabled index', () => {
        expect(lastEnabledIndex(items, item => !!item.disabled)).toBe(3);
    });

    it('moves to the next enabled index', () => {
        expect(nextEnabledIndex(items, 0, item => !!item.disabled)).toBe(2);
    });

    it('moves to the previous enabled index', () => {
        expect(previousEnabledIndex(items, 3, item => !!item.disabled)).toBe(2);
    });

    it('wraps around when requested', () => {
        expect(nextEnabledIndex(items, 3, item => !!item.disabled, true)).toBe(0);
        expect(previousEnabledIndex(items, 0, item => !!item.disabled, true)).toBe(3);
    });

    it('returns the current index when all items are disabled', () => {
        const disabledItems = items.map(item => ({ ...item, disabled: true }));
        expect(nextEnabledIndex(disabledItems, 1, item => !!item.disabled)).toBe(1);
        expect(previousEnabledIndex(disabledItems, 1, item => !!item.disabled)).toBe(1);
    });

    it('handles a single enabled item', () => {
        const single: DemoItem[] = [{ label: 'A' }];
        expect(nextEnabledIndex(single, 0, item => !!item.disabled)).toBe(0);
        expect(previousEnabledIndex(single, 0, item => !!item.disabled)).toBe(0);
    });

    it('handles an empty list', () => {
        expect(firstEnabledIndex([], () => false)).toBe(-1);
        expect(lastEnabledIndex([], () => false)).toBe(-1);
        expect(nextEnabledIndex([], 0, () => false)).toBe(0);
        expect(previousEnabledIndex([], 0, () => false)).toBe(0);
    });
});
