// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for OrderedList widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { OrderedList, type OrderedListItem } from './OrderedList.js';
import { Screen } from '@termuijs/core';

function makeList(
    items: OrderedListItem[],
    opts?: ConstructorParameters<typeof OrderedList>[2],
    width = 40,
    height = 20,
): OrderedList {
    const list = new OrderedList(items, {}, opts);
    list.updateRect({ x: 0, y: 0, width, height });
    return list;
}

function renderList(list: OrderedList, width = 40, height = 20): Screen {
    const screen = new Screen(width, height);
    list.updateRect({ x: 0, y: 0, width, height });
    list.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

describe('OrderedList', () => {

    describe('1. Arabic numerals (default style)', () => {
        it('renders 1., 2., 3. prefixes for a 3-item list', () => {
            const items: OrderedListItem[] = [
                { text: 'Alpha' },
                { text: 'Beta' },
                { text: 'Gamma' },
            ];
            const list = makeList(items);
            const screen = renderList(list);

            expect(rowText(screen, 0)).toContain('1.');
            expect(rowText(screen, 0)).toContain('Alpha');
            expect(rowText(screen, 1)).toContain('2.');
            expect(rowText(screen, 1)).toContain('Beta');
            expect(rowText(screen, 2)).toContain('3.');
            expect(rowText(screen, 2)).toContain('Gamma');
        });
    });

    describe('2. Nested items', () => {
        it('renders nested item with indent and restarts numbering from 1.', () => {
            const items: OrderedListItem[] = [
                {
                    text: 'Parent',
                    children: [{ text: 'Child' }],
                },
            ];
            const list = makeList(items, { indent: 3 });
            const screen = renderList(list);

            const row0 = rowText(screen, 0);
            const row1 = rowText(screen, 1);

            expect(row0).toContain('1.');
            expect(row0).toContain('Parent');
            expect(row1).toMatch(/^\s+/);
            expect(row1).toContain('1.');
            expect(row1).toContain('Child');
        });
    });

    describe('3. Alpha style', () => {
        it('renders a., b. prefixes with style: "a."', () => {
            const items: OrderedListItem[] = [
                { text: 'First' },
                { text: 'Second' },
            ];
            const list = makeList(items, { style: 'a.' });
            const screen = renderList(list);

            expect(rowText(screen, 0)).toContain('a.');
            expect(rowText(screen, 0)).toContain('First');
            expect(rowText(screen, 1)).toContain('b.');
            expect(rowText(screen, 1)).toContain('Second');
        });
    });

    describe('4. Roman style', () => {
        it('renders i., ii., iii. prefixes with style: "i."', () => {
            const items: OrderedListItem[] = [
                { text: 'Alpha' },
                { text: 'Beta' },
                { text: 'Gamma' },
            ];
            const list = makeList(items, { style: 'i.' });
            const screen = renderList(list);

            expect(rowText(screen, 0)).toContain('i.');
            expect(rowText(screen, 0)).toContain('Alpha');
            expect(rowText(screen, 1)).toContain('ii.');
            expect(rowText(screen, 1)).toContain('Beta');
            expect(rowText(screen, 2)).toContain('iii.');
            expect(rowText(screen, 2)).toContain('Gamma');
        });
    });

    describe('6. setItems triggers markDirty', () => {
        it('calls markDirty when setItems is called', () => {
            const items: OrderedListItem[] = [{ text: 'Item' }];
            const list = makeList(items);

            const spy = vi.spyOn(list as any, 'markDirty');
            list.setItems([{ text: 'New Item' }]);

            expect(spy).toHaveBeenCalledOnce();
        });
    });

});
