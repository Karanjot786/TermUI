// -----------------------------------------------------------------------------
// @termuijs/widgets - Tests for UnorderedList widget
// -----------------------------------------------------------------------------

import { afterEach, describe, expect, it, vi } from 'vitest';
import { caps, Screen } from '@termuijs/core';
import { UnorderedList, type ListItem } from './UnorderedList.js';

function renderList(
    items: ListItem[],
    opts = {},
    width = 40,
    height = 10,
): { list: UnorderedList; screen: Screen } {
    const list = new UnorderedList(items, {}, opts);
    const screen = new Screen(width, height);

    list.updateRect({ x: 0, y: 0, width, height });
    list.render(screen);

    return { list, screen };
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

describe('UnorderedList', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders a two-item list with bullet prefixes', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const { screen } = renderList([
            { text: 'Install dependencies' },
            { text: 'Run tests' },
        ]);

        expect(rowText(screen, 0)).toBe('\u2022 Install dependencies');
        expect(rowText(screen, 1)).toBe('\u2022 Run tests');
    });

    it('renders nested items with indentation and level-specific markers', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const { screen } = renderList([
            {
                text: 'Parent',
                children: [{ text: 'Child' }],
            },
        ]);

        expect(rowText(screen, 0)).toBe('\u2022 Parent');
        expect(rowText(screen, 1)).toBe('  \u25E6 Child');
    });

    it('uses ASCII fallback markers when unicode is unavailable', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderList([
            {
                text: 'Parent',
                children: [{ text: 'Child' }],
            },
        ]);

        expect(rowText(screen, 0)).toBe('* Parent');
        expect(rowText(screen, 1)).toBe('  - Child');
    });

    it('uses custom markers for each nesting level', () => {
        const { screen } = renderList(
            [
                {
                    text: 'Root',
                    children: [
                        {
                            text: 'Branch',
                            children: [{ text: 'Leaf' }],
                        },
                    ],
                },
            ],
            { markers: ['>', '~'], indent: 3 },
        );

        expect(rowText(screen, 0)).toBe('> Root');
        expect(rowText(screen, 1)).toBe('   ~ Branch');
        expect(rowText(screen, 2)).toBe('      ~ Leaf');
    });

    it('setItems updates the list and marks the widget dirty', () => {
        const { list, screen } = renderList([{ text: 'Old item' }]);
        expect(rowText(screen, 0)).toContain('Old item');

        list.clearDirty();
        list.setItems([{ text: 'New item' }]);

        const nextScreen = new Screen(40, 10);
        list.render(nextScreen);

        expect(list.isDirty).toBe(true);
        expect(rowText(nextScreen, 0)).toContain('New item');
    });
});
