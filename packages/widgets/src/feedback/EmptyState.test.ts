import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { EmptyState } from './EmptyState.js';

afterEach(() => {
    vi.restoreAllMocks();
});

function row(screen: Screen, y: number): string {
    return screen.back[y].map((c: { char: string }) => c.char).join('');
}

describe('EmptyState', () => {
    it('renders icon + title centered', () => {
        const es = new EmptyState('No items');
        es.updateRect({ x: 0, y: 0, width: 30, height: 5 });
        const screen = new Screen(30, 5);
        es.render(screen);

        const iconRow = 1;
        const titleRow = 2;
        expect(row(screen, iconRow).trim()).toBe('📭');
        expect(row(screen, titleRow).trim()).toBe('No items');
    });

    it('renders description when provided', () => {
        const es = new EmptyState('No results', {}, { description: 'Try a different search' });
        es.updateRect({ x: 0, y: 0, width: 40, height: 6 });
        const screen = new Screen(40, 6);
        es.render(screen);

        const descRow = 3;
        expect(row(screen, descRow).trim()).toContain('Try a different search');
    });

    it('setTitle updates text', () => {
        const es = new EmptyState('Old title');
        es.setTitle('New title');
        es.updateRect({ x: 0, y: 0, width: 30, height: 5 });
        const screen = new Screen(30, 5);
        es.render(screen);

        const titleRow = 2;
        expect(row(screen, titleRow).trim()).toContain('New title');
        expect(row(screen, titleRow).trim()).not.toContain('Old title');
    });

    it('handles very narrow width gracefully', () => {
        const es = new EmptyState('Wide title', {}, { description: 'desc' });
        es.updateRect({ x: 0, y: 0, width: 3, height: 5 });
        const screen = new Screen(3, 5);
        expect(() => es.render(screen)).not.toThrow();
    });

    it('renders hint when provided', () => {
        const es = new EmptyState('No data', {}, { hint: 'Press F5 to refresh' });
        es.updateRect({ x: 0, y: 0, width: 40, height: 7 });
        const screen = new Screen(40, 7);
        es.render(screen);

        const hintRow = 6;
        expect(row(screen, hintRow).trim()).toContain('Press F5 to refresh');
    });

    it('setTitle marks widget dirty', () => {
        const es = new EmptyState('Old title');
    
        es.clearDirty();
        es.setTitle('New title');
    
        expect(es.isDirty).toBe(true);
    });
    
    it('setDescription marks widget dirty', () => {
        const es = new EmptyState(
            'Title',
            {},
            { description: 'Old description' },
        );
    
        es.clearDirty();
        es.setDescription('New description');
    
        expect(es.isDirty).toBe(true);
    });
    
    it('does not mark dirty when title is unchanged', () => {
        const es = new EmptyState('Same title');
    
        es.clearDirty();
        es.setTitle('Same title');
    
        expect(es.isDirty).toBe(false);
    });
    
    it('does not mark dirty when description is unchanged', () => {
        const es = new EmptyState(
            'Title',
            {},
            { description: 'Same description' },
        );
    
        es.clearDirty();
        es.setDescription('Same description');
    
        expect(es.isDirty).toBe(false);
    });
    
    it('setIcon marks widget dirty', () => {
        const es = new EmptyState('Title');
    
        es.clearDirty();
        es.setIcon('📦');
    
        expect(es.isDirty).toBe(true);
    });
    
    it('setHint marks widget dirty', () => {
        const es = new EmptyState('Title');
    
        es.clearDirty();
        es.setHint('Press Enter');
    
        expect(es.isDirty).toBe(true);
    });
    
    it('does not mark dirty when icon is unchanged', () => {
        const es = new EmptyState(
            'Title',
            {},
            { icon: '📦' },
        );
    
        es.clearDirty();
        es.setIcon('📦');
    
        expect(es.isDirty).toBe(false);
    });
    
    it('does not mark dirty when hint is unchanged', () => {
        const es = new EmptyState(
            'Title',
            {},
            { hint: 'Press Enter' },
        );
    
        es.clearDirty();
        es.setHint('Press Enter');
    
        expect(es.isDirty).toBe(false);
    });
    
    it('setHint updates rendered hint', () => {
        const es = new EmptyState('No data');
    
        es.setHint('Press Enter');
        es.updateRect({ x: 0, y: 0, width: 40, height: 7 });
    
        const screen = new Screen(40, 7);
        es.render(screen);
    
        expect(row(screen, 6).trim()).toContain('Press Enter');
    });
    
    it('setIcon updates rendered icon', () => {
        const es = new EmptyState('No data');
    
        es.setIcon('📦');
        es.updateRect({ x: 0, y: 0, width: 30, height: 5 });
    
        const screen = new Screen(30, 5);
        es.render(screen);
    
        expect(row(screen, 1).trim()).toBe('📦');
    });

    it('sets a11y role and label on construction', () => {
        const es = new EmptyState('No items', {}, { description: 'Try again', hint: 'Press F5' });

        expect(es.a11y).toEqual({
            role: 'region',
            label: 'No items. Try again. Press F5',
        });
    });

    it('sets a11y label from title alone when no description/hint given', () => {
        const es = new EmptyState('No items');

        expect(es.a11y).toEqual({
            role: 'region',
            label: 'No items',
        });
    });

    it('refreshes a11y label when setTitle is called', () => {
        const es = new EmptyState('Old title');

        es.setTitle('New title');

        expect(es.a11y).toEqual({
            role: 'region',
            label: 'New title',
        });
    });

    it('refreshes a11y label when setDescription is called', () => {
        const es = new EmptyState('Title');

        es.setDescription('New description');

        expect(es.a11y).toEqual({
            role: 'region',
            label: 'Title. New description',
        });
    });

    it('refreshes a11y label when setHint is called', () => {
        const es = new EmptyState('Title');

        es.setHint('New hint');

        expect(es.a11y).toEqual({
            role: 'region',
            label: 'Title. New hint',
        });
    });

});
