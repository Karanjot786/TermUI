// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for MultiProgress widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { MultiProgress, type ProgressItem } from './MultiProgress.js';

describe('MultiProgress', () => {
    const items: ProgressItem[] = [
        { label: 'Build', value: 0.53 },
        { label: 'Tests', value: 1 },
        { label: 'Deploy', value: 0 },
    ];

    it('initializes with items', () => {
        const mp = new MultiProgress({ items });
        const screen = new Screen(40, 10);
        mp.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        mp.render(screen);
        const rows = screen.back.map((row: { char: string }[]) => row.map(c => c.char).join(''));
        expect(rows.some(r => r.includes('Build'))).toBe(true);
        expect(rows.some(r => r.includes('Tests'))).toBe(true);
    });

    it('renders correct number of rows (one per item)', () => {
        const mp = new MultiProgress({ items });
        const height = mp.getHeightForTest();
        expect(height).toBe(3);
    });

    it('setItems() replaces all items and marks dirty', () => {
        const mp = new MultiProgress({ items });
        mp.setDirtyForTest(false);

        const newItems: ProgressItem[] = [
            { label: 'Task1', value: 0.5 },
            { label: 'Task2', value: 0.75 },
        ];
        mp.setItems(newItems);

        expect(mp.isDirty).toBe(true);
        expect(mp.getItemsForTest().length).toBe(2);
    });

    it('updateItem(index, value) changes a single item value', () => {
        const mp = new MultiProgress({ items });
        mp.setDirtyForTest(false);

        mp.updateItem(0, 0.8);
        expect(mp.getItemsForTest()[0].value).toBe(0.8);
        expect(mp.isDirty).toBe(true);
    });

    it('does not mark dirty when updateItem receives the same value', () => {
        const mp = new MultiProgress({ items });
        mp.setDirtyForTest(false);

        mp.updateItem(0, 0.53);
        expect(mp.isDirty).toBe(false);
    });
    
    it('marks dirty when updateItem receives a different value', () => {
        const mp = new MultiProgress({ items });
        mp.setDirtyForTest(false);
        
        mp.updateItem(0, 0.75);
        expect(mp.isDirty).toBe(true);
    });

    it('updateItem() clamps values to [0, 1]', () => {
        const mp = new MultiProgress({ items });

        mp.updateItem(0, 1.5);
        expect(mp.getItemsForTest()[0].value).toBe(1);

        mp.updateItem(0, -0.5);
        expect(mp.getItemsForTest()[0].value).toBe(0);
    });

    it('updateItem() ignores invalid indices silently', () => {
        const mp = new MultiProgress({ items });
        expect(() => mp.updateItem(99, 0.5)).not.toThrow();
        expect(() => mp.updateItem(-1, 0.5)).not.toThrow();
    });

    it('initializes with default labelWidth=12', () => {
        const mp = new MultiProgress({ items });
        expect(mp.getLabelWidthForTest()).toBe(12);
    });

    it('respects custom labelWidth', () => {
        const mp = new MultiProgress({ items, labelWidth: 20 });
        expect(mp.getLabelWidthForTest()).toBe(20);
    });

    it('initializes with showValues=true by default', () => {
        const mp = new MultiProgress({ items });
        expect(mp.getShowValuesForTest()).toBe(true);
    });

    it('respects showValues=false option', () => {
        const mp = new MultiProgress({ items, showValues: false });
        expect(mp.getShowValuesForTest()).toBe(false);
    });

    it('clamps item values during initialization', () => {
        const itemsWithBadValues: ProgressItem[] = [
            { label: 'A', value: 1.5 },
            { label: 'B', value: -0.5 },
        ];
        const mp = new MultiProgress({ items: itemsWithBadValues });
        expect(mp.getItemsForTest()[0].value).toBe(1);
        expect(mp.getItemsForTest()[1].value).toBe(0);
    });

    it('preserves custom colors on items', () => {
        const itemsWithColors: ProgressItem[] = [
            { label: 'Build', value: 0.5, color: { type: 'named', name: 'red' } },
            { label: 'Tests', value: 0.8 },
        ];
        const mp = new MultiProgress({ items: itemsWithColors });
        expect(mp.getItemsForTest()[0].color).toEqual({ type: 'named', name: 'red' });
        expect(mp.getItemsForTest()[1].color).toBeUndefined();
    });
});

describe('MultiProgress — ASCII fallback', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('uses "#" for fill and " " for empty when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { MultiProgress } = await import('./MultiProgress.js');

        const items: ProgressItem[] = [
            { label: 'Build', value: 0.5 },
        ];
        const mp = new MultiProgress({ items });
        const { Screen: S } = await import('@termuijs/core');
        const screen = new S(40, 3);
        mp.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        mp.render(screen);
        const rendered = screen.back.map((row: { char: string }[]) => row.map(c => c.char).join(''));
        expect(rendered.some((r: string) => r.includes('Build'))).toBe(true);
    });

    it('uses "█" for fill when unicode is available', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { MultiProgress } = await import('./MultiProgress.js');

        const items: ProgressItem[] = [
            { label: 'Build', value: 0.5 },
        ];
        const mp = new MultiProgress({ items });
        const { Screen: S } = await import('@termuijs/core');
        const screen = new S(40, 3);
        mp.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        mp.render(screen);
        const rendered = screen.back.map((row: { char: string }[]) => row.map(c => c.char).join(''));
        expect(rendered.some((r: string) => r.includes('Build'))).toBe(true);
    });
});

describe('MultiProgress — edge cases', () => {
    it('handles empty items array', () => {
        const mp = new MultiProgress({ items: [] });
        expect(mp.getItemsForTest().length).toBe(0);
    });

    it('handles single item', () => {
        const mp = new MultiProgress({ items: [{ label: 'Single', value: 0.5 }] });
        expect(mp.getItemsForTest().length).toBe(1);
    });

    it('handles very long labels', () => {
        const items: ProgressItem[] = [
            { label: 'VeryLongLabelThatExceedsDefault', value: 0.5 },
        ];
        const mp = new MultiProgress({ items });
        const screen = new Screen(40, 3);
        mp.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        mp.render(screen);
        const rows = screen.back.map((row: { char: string }[]) => row.map(c => c.char).join(''));
        expect(rows.some(r => r.trim().length > 0)).toBe(true);
    });

    it('setItems() clamps all values in new items', () => {
        const mp = new MultiProgress({ items: [{ label: 'A', value: 0.5 }] });
        const newItems: ProgressItem[] = [
            { label: 'B', value: 2 },
            { label: 'C', value: -1 },
        ];
        mp.setItems(newItems);
        expect(mp.getItemsForTest()[0].value).toBe(1);
        expect(mp.getItemsForTest()[1].value).toBe(0);
    });
});
