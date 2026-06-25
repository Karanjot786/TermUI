import { afterEach, describe, expect, it, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import type { Style } from '@termuijs/core';
import { Placeholder, type PlaceholderOptions } from './Placeholder.js';

function renderPlaceholder(
    label: string,
    style: Partial<Style> = {},
    opts: PlaceholderOptions = {},
    width = 16,
    height = 5,
) {
    const placeholder = new Placeholder(label, style, opts);
    const screen = new Screen(width, height);
    placeholder.updateRect({ x: 0, y: 0, width, height });
    placeholder.render(screen);
    return { placeholder, screen };
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(cell => cell.char).join('');
}

describe('Placeholder', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the label centered in the widget area', () => {
        const { screen } = renderPlaceholder('Preview');

        expect(rowText(screen, 2)).toContain('Preview');
    });

    it('fills the background with the fill character', () => {
        const { screen } = renderPlaceholder('Box', {}, { fillChar: '*' });

        expect(screen.back[1][1].char).toBe('*');
        expect(screen.back[3][14].char).toBe('*');
    });

    it('renders a border around the widget', () => {
        const { screen } = renderPlaceholder('Box');

        expect(screen.back[0][0].char).toBe('\u250c');
        expect(screen.back[0][15].char).toBe('\u2510');
        expect(screen.back[4][0].char).toBe('\u2514');
        expect(screen.back[4][15].char).toBe('\u2518');
    });

    it('setLabel updates the rendered label and marks dirty', () => {
        const placeholder = new Placeholder('Old');
        const screen = new Screen(16, 5);

        placeholder.clearDirty();
        placeholder.setLabel('New');
        expect(placeholder.isDirty).toBe(true);

        placeholder.updateRect({ x: 0, y: 0, width: 16, height: 5 });
        placeholder.render(screen);

        expect(rowText(screen, 2)).toContain('New');
    });

    it('uses ASCII fallback for fill and border characters', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderPlaceholder('Box');

        expect(screen.back[1][1].char).toBe('.');
        expect(screen.back[0][0].char).toBe('+');
        expect(screen.back[0][1].char).toBe('-');
        expect(screen.back[1][0].char).toBe('|');
    });

    it('does not mark dirty when setLabel receives the same value', () => {
        const placeholder = new Placeholder('Loading');
    
        placeholder.clearDirty();
    
        placeholder.setLabel('Loading');
    
        expect(placeholder.isDirty).toBe(false);
    });
    
    it('marks dirty when setLabel receives a different value', () => {
        const placeholder = new Placeholder('Loading');
    
        placeholder.clearDirty();
    
        placeholder.setLabel('Ready');
    
        expect(placeholder.isDirty).toBe(true);
    });

});
