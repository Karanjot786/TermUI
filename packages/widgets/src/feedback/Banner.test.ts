import { Screen } from '@termuijs/core';
import { describe, expect, it, vi } from 'vitest';
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

    it('renders with default padding (padding = 1)', () => {
        const banner = new Banner(
            { width: 30, height: 6 },
            { title: 'TITLE', body: 'BODY' }
        );
        banner.updateRect({ x: 0, y: 0, width: 30, height: 6 });
        const screen = new Screen(30, 6);
        banner.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));
        
        // Default padding: 1. Border width: 1.
        // cx = x + borderWidth (1) + padding.left (1) = 2.
        // cy = y + borderWidth (1) + padding.top (1) = 2.
        // Row 2 should contain the title
        expect(rows[2].slice(2, 7)).toBe('TITLE');
        // Row 3 should contain the body
        expect(rows[3].slice(2, 6)).toBe('BODY');
    });

    it('respects custom padding: 0', () => {
        const banner = new Banner(
            { width: 30, height: 6, padding: 0 },
            { title: 'TITLE', body: 'BODY' }
        );
        banner.updateRect({ x: 0, y: 0, width: 30, height: 6 });
        const screen = new Screen(30, 6);
        banner.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));
        
        // padding: 0. Border width: 1.
        // cx = x + 1 + 0 = 1.
        // cy = y + 1 + 0 = 1.
        // Row 1 should contain the title
        expect(rows[1].slice(1, 6)).toBe('TITLE');
        // Row 2 should contain the body
        expect(rows[2].slice(1, 5)).toBe('BODY');
    });

    it('respects custom edge padding: { top: 0, left: 3 }', () => {
        const banner = new Banner(
            { width: 30, height: 6, padding: { top: 0, left: 3 } },
            { title: 'TITLE', body: 'BODY' }
        );
        banner.updateRect({ x: 0, y: 0, width: 30, height: 6 });
        const screen = new Screen(30, 6);
        banner.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));

        // padding left: 3, top: 0. Border: 1.
        // cx = 1 + 3 = 4.
        // cy = 1 + 0 = 1.
        expect(rows[1].slice(4, 9)).toBe('TITLE');
        expect(rows[2].slice(4, 8)).toBe('BODY');
    });

    it('respects custom edge padding: { right: 5, bottom: 2 } for content truncation and clipping', () => {
        const banner = new Banner(
            { width: 20, height: 6, padding: { right: 5, bottom: 2 } },
            { title: 'LONGTITLE', body: 'LONGBODY' }
        );
        banner.updateRect({ x: 0, y: 0, width: 20, height: 6 });
        const screen = new Screen(20, 6);
        banner.render(screen);

        const rows = screen.back.map(row => row.map(cell => cell.char).join(''));

        // Width = 20. Border = 1. Padding: left = 0, right = 5.
        // cx = 1 (border) + 0 (padding.left) = 1.
        // contentWidth = 20 - 2 (border) - 0 (padding.left) - 5 (padding.right) = 13.
        // cy = 1 (border) + 0 (padding.top) = 1.
        // Title is rendered at row 1.
        expect(rows[1].slice(1, 10)).toBe('LONGTITLE');
        // Body is rendered at row 2.
        expect(rows[2].slice(1, 9)).toBe('LONGBODY');

        // Let's test truncation by adding a very long body (contentHeight = 2).
        const banner2 = new Banner(
            { width: 20, height: 6, padding: { right: 10, bottom: 2 } },
            { title: 'TITLE', body: 'VERYLONGBODYTEXT' }
        );
        banner2.updateRect({ x: 0, y: 0, width: 20, height: 6 });
        const screen2 = new Screen(20, 6);
        banner2.render(screen2);

        const rows2 = screen2.back.map(row => row.map(cell => cell.char).join(''));
        
        // Width = 20. Border = 1. Padding: left = 0, right = 10.
        // contentWidth = 20 - 2 - 0 - 10 = 8.
        // Body 'VERYLONGBODYTEXT' should be truncated to 8 characters ('VERYLONG').
        // Row 2 should contain 'VERYLONG'
        expect(rows2[2]).toContain('VERYLONG');
        expect(rows2[2]).not.toContain('VERYLONGB');

        // Let's test clipping by adding bottom padding = 3 (contentHeight = 1).
        const banner3 = new Banner(
            { width: 20, height: 6, padding: { right: 10, bottom: 3 } },
            { title: 'TITLE', body: 'BODY' }
        );
        banner3.updateRect({ x: 0, y: 0, width: 20, height: 6 });
        const screen3 = new Screen(20, 6);
        banner3.render(screen3);

        const rows3 = screen3.back.map(row => row.map(cell => cell.char).join(''));
        // With contentHeight = 1, only the Title can be rendered. The body should be clipped and not render at all.
        // Row 2 (where body would be) should be empty/spaces except for the border.
        expect(rows3[2].slice(2, 18).trim()).toBe('');
    });

    it('mutations trigger markDirty()', () => {
        const banner = new Banner();
        const spy = vi.spyOn(banner, 'markDirty');

        banner.setTitle('New Title');
        expect(spy).toHaveBeenCalledTimes(1);

        banner.setBody('New Body');
        expect(spy).toHaveBeenCalledTimes(2);

        banner.setVariant('success');
        expect(spy).toHaveBeenCalledTimes(3);
    });

    it('does not mark dirty when title is unchanged', () => {
        const banner = new Banner({}, { title: 'Hello' });
    
        banner.clearDirty();
        banner.setTitle('Hello');
    
        expect(banner.isDirty).toBe(false);
    });
    
    it('does not mark dirty when body is unchanged', () => {
        const banner = new Banner({}, { body: 'World' });
    
        banner.clearDirty();
        banner.setBody('World');
    
        expect(banner.isDirty).toBe(false);
    });

    it('does not mark dirty when variant is unchanged', () => {
        const banner = new Banner({}, { variant: 'error' });

        banner.clearDirty();
        banner.setVariant('error');

        expect(banner.isDirty).toBe(false);
    });

    it('renders body without a title', () => {
        const screen = renderBanner(
            new Banner({}, { body: 'just body' }),
            18,
            6,
        );

        expect(rowText(screen, 2)).toContain('just body');
    });

    it('draws horizontal border characters along top and bottom edges', () => {
        const screen = renderBanner(new Banner(), 10, 4);

        // Top-left and top-right corners are non-space border chars
        expect(cell(screen, 0, 0).char).not.toBe(' ');
        expect(cell(screen, 9, 0).char).not.toBe(' ');
        // Horizontal bar along top
        expect(cell(screen, 1, 0).char).not.toBe(' ');
        // Bottom-left and bottom-right corners
        expect(cell(screen, 0, 3).char).not.toBe(' ');
        expect(cell(screen, 9, 3).char).not.toBe(' ');
    });

    describe('Banner — getters', () => {
        it('returns correct title, body, and variant via getters', () => {
            const banner = new Banner({}, { title: 'T', body: 'B', variant: 'warning' });
            expect(banner.getTitle()).toBe('T');
            expect(banner.getBody()).toBe('B');
            expect(banner.getVariant()).toBe('warning');
        });
    });
});
