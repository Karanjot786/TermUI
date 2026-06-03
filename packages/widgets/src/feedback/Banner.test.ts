import { Screen } from '@termuijs/core';
import { describe, expect, it } from 'vitest';
import { Banner } from './Banner.js';
import type { StatusVariant } from './StatusMessage.js';

type TestCell = {
    char: string;
    fg?: unknown;
    bold?: boolean;
};

const variantColors: Record<StatusVariant, { type: 'named'; name: string }> = {
    success: { type: 'named', name: 'green' },
    error: { type: 'named', name: 'red' },
    warning: { type: 'named', name: 'yellow' },
    info: { type: 'named', name: 'cyan' },
};

function renderBanner(banner: Banner, width = 24, height = 6): Screen {
    const screen = new Screen(width, height);
    banner.updateRect({ x: 0, y: 0, width, height });
    banner.render(screen);
    return screen;
}

function cell(screen: Screen, x: number, y: number): TestCell {
    return screen.back[y][x] as TestCell;
}

function rowText(screen: Screen, y: number): string {
    return screen.back[y].map((entry: TestCell) => entry.char).join('');
}

describe('Banner', () => {
    it('renders an info-colored border by default', () => {
        const screen = renderBanner(new Banner(), 12, 4);

        expect(cell(screen, 0, 0).char).not.toBe(' ');
        expect(cell(screen, 0, 0).fg).toEqual(variantColors.info);
        expect(cell(screen, 11, 0).fg).toEqual(variantColors.info);
        expect(cell(screen, 0, 3).fg).toEqual(variantColors.info);
        expect(cell(screen, 11, 3).fg).toEqual(variantColors.info);
    });

    it('renders title in bold and body below it', () => {
        const screen = renderBanner(
            new Banner({}, { title: 'Build', body: 'ship faster' }),
            18,
            6,
        );

        expect(rowText(screen, 2)).toContain('Build');
        expect(rowText(screen, 3)).toContain('ship faster');
        expect(cell(screen, 2, 2).fg).toEqual(variantColors.info);
        expect(cell(screen, 2, 2).bold).toBe(true);
        expect(cell(screen, 2, 3).fg).toEqual(variantColors.info);
        expect(cell(screen, 2, 3).bold).not.toBe(true);
    });

    it('renders multiple body lines within the content area', () => {
        const screen = renderBanner(new Banner({}, { body: 'first\nsecond\nthird' }), 16, 7);

        expect(rowText(screen, 2)).toContain('first');
        expect(rowText(screen, 3)).toContain('second');
        expect(rowText(screen, 4)).toContain('third');
    });

    it('applies each variant color to border, title, and body', () => {
        for (const [variant, color] of Object.entries(variantColors) as Array<
            [StatusVariant, (typeof variantColors)[StatusVariant]]
        >) {
            const screen = renderBanner(
                new Banner({}, { variant, title: 'Heads up', body: 'details' }),
                18,
                6,
            );

            expect(cell(screen, 0, 0).fg).toEqual(color);
            expect(cell(screen, 17, 0).fg).toEqual(color);
            expect(cell(screen, 0, 5).fg).toEqual(color);
            expect(cell(screen, 17, 5).fg).toEqual(color);
            expect(cell(screen, 2, 2).fg).toEqual(color);
            expect(cell(screen, 2, 3).fg).toEqual(color);
        }
    });

    it('updates rendered content and color through setters', () => {
        const banner = new Banner({}, { title: 'Old', body: 'Before' });

        banner.setTitle('New');
        banner.setBody('After');
        banner.setVariant('success');

        const screen = renderBanner(banner, 16, 6);

        expect(rowText(screen, 2)).toContain('New');
        expect(rowText(screen, 2)).not.toContain('Old');
        expect(rowText(screen, 3)).toContain('After');
        expect(rowText(screen, 3)).not.toContain('Before');
        expect(cell(screen, 0, 0).fg).toEqual(variantColors.success);
        expect(cell(screen, 2, 2).fg).toEqual(variantColors.success);
    });

    it('truncates title and body to the available content width', () => {
        const screen = renderBanner(
            new Banner({}, { title: 'LongTitle', body: 'LongBody' }),
            8,
            6,
        );

        expect(rowText(screen, 2)).toContain('Long');
        expect(rowText(screen, 2)).not.toContain('LongT');
        expect(rowText(screen, 3)).toContain('Long');
        expect(rowText(screen, 3)).not.toContain('LongB');
    });

    it('does not render when dimensions are too small for a border', () => {
        const screen = renderBanner(new Banner({}, { title: 'Hidden' }), 1, 1);

        expect(cell(screen, 0, 0).char).toBe(' ');
        expect(rowText(screen, 0)).not.toContain('Hidden');
    });
});
