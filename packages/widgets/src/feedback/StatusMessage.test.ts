import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { caps, Screen } from '@termuijs/core';
import { StatusMessage, type StatusVariant } from './StatusMessage.js';

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

function renderStatus(
    widget: StatusMessage,
    width = 30,
    height = 1,
): Screen {
    const screen = new Screen(width, height);

    widget.updateRect({
        x: 0,
        y: 0,
        width,
        height,
    });

    widget.render(screen);
    return screen;
}

function rowText(screen: Screen, y: number): string {
    return screen.back[y]
        .map((cell: TestCell) => cell.char)
        .join('');
}

function cell(screen: Screen, x: number, y: number): TestCell {
    return screen.back[y][x] as TestCell;
}

describe('StatusMessage', () => {
    beforeEach(() => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders message text', () => {
        const screen = renderStatus(
            new StatusMessage('Saved'),
        );

        expect(rowText(screen, 0)).toContain('Saved');
    });

    it('renders success variant', () => {
        const screen = renderStatus(
            new StatusMessage('Done', {}, { variant: 'success' }),
        );

        expect(cell(screen, 0, 0).char).toBe('✓');
        expect(cell(screen, 0, 0).fg).toEqual(variantColors.success);
    });

    it('renders error variant', () => {
        const screen = renderStatus(
            new StatusMessage('Failed', {}, { variant: 'error' }),
        );

        expect(cell(screen, 0, 0).char).toBe('✗');
        expect(cell(screen, 0, 0).fg).toEqual(variantColors.error);
    });

    it('renders warning variant', () => {
        const screen = renderStatus(
            new StatusMessage('Careful', {}, { variant: 'warning' }),
        );

        expect(cell(screen, 0, 0).char).toBe('⚠');
        expect(cell(screen, 0, 0).fg).toEqual(variantColors.warning);
    });

    it('renders info variant', () => {
        const screen = renderStatus(
            new StatusMessage('Info'),
        );

        expect(cell(screen, 0, 0).char).toBe('ℹ');
        expect(cell(screen, 0, 0).fg).toEqual(variantColors.info);
    });

    it('setMessage updates rendered text', () => {
        const widget = new StatusMessage('Old');

        widget.setMessage('New');

        const screen = renderStatus(widget);

        expect(rowText(screen, 0)).toContain('New');
        expect(rowText(screen, 0)).not.toContain('Old');
    });

    it('setVariant updates icon and color', () => {
        const widget = new StatusMessage(
            'Message',
            {},
            { variant: 'info' },
        );

        widget.setVariant('success');

        const screen = renderStatus(widget);

        expect(cell(screen, 0, 0).char).toBe('✓');
        expect(cell(screen, 0, 0).fg).toEqual(variantColors.success);
    });

    it('renders ASCII fallback icons', () => {
        vi.restoreAllMocks();
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const screen = renderStatus(
            new StatusMessage(
                'Done',
                {},
                { variant: 'success' },
            ),
        );

        expect(cell(screen, 0, 0).char).toBe('+');
    });

    it('setMessage marks widget dirty', () => {
        const widget = new StatusMessage('Old');
    
        widget.clearDirty();
        widget.setMessage('New');
    
        expect(widget.isDirty).toBe(true);
    });
    
    it('setVariant marks widget dirty', () => {
        const widget = new StatusMessage(
            'Message',
            {},
            { variant: 'info' },
        );
    
        widget.clearDirty();
        widget.setVariant('success');
    
        expect(widget.isDirty).toBe(true);
    });
    
    it('does not mark dirty when message is unchanged', () => {
        const widget = new StatusMessage('Saved');
    
        widget.clearDirty();
        widget.setMessage('Saved');
    
        expect(widget.isDirty).toBe(false);
    });
    
    it('does not mark dirty when variant is unchanged', () => {
        const widget = new StatusMessage(
            'Saved',
            {},
            { variant: 'success' },
        );
    
        widget.clearDirty();
        widget.setVariant('success');
    
        expect(widget.isDirty).toBe(false);
    });

});