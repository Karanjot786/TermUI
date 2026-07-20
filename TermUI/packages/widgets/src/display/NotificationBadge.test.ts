// @termuijs/widgets - Tests for NotificationBadge widget

import { describe, it, expect } from 'vitest';
import { NotificationBadge } from './NotificationBadge.js';
import { Screen } from '@termuijs/core';

/** Helper: create widget, set rect, render to a screen, return both. */
function renderBadge(
    opts: ConstructorParameters<typeof NotificationBadge>[0] = {},
    style: ConstructorParameters<typeof NotificationBadge>[1] = {},
    width = 20,
    height = 5,
) {
    const badge = new NotificationBadge(opts, style);
    const screen = new Screen(width, height);
    badge.updateRect({ x: 0, y: 0, width, height });
    badge.render(screen);
    return { badge, screen };
}

/** Read a single row from the back buffer as a plain string. */
function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

describe('NotificationBadge', () => {
    it('renders nothing when count is 0', () => {
        const { screen } = renderBadge({ count: 0 });
        // All cells should remain at defaults (space char, no red bg)
        for (let col = 0; col < 20; col++) {
            expect(screen.back[0][col].bg).not.toEqual({ type: 'named', name: 'red' });
        }
    });

    it('renders nothing when count is not provided (defaults to 0)', () => {
        const { screen } = renderBadge({});
        for (let col = 0; col < 20; col++) {
            expect(screen.back[0][col].bg).not.toEqual({ type: 'named', name: 'red' });
        }
    });

    it('renders the count number at the specified position', () => {
        const { screen } = renderBadge({ count: 5, position: 'top-right' });
        // Count "5" should appear somewhere on the top row
        const topRow = rowText(screen, 0);
        expect(topRow).toContain('5');
    });

    it('renders with red background and white foreground', () => {
        const { screen } = renderBadge({ count: 3, position: 'top-left' });
        // The label starts at column 0, row 0
        expect(screen.back[0][0].bg).toEqual({ type: 'named', name: 'red' });
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'white' });
        expect(screen.back[0][0].bold).toBe(true);
    });

    it('renders multi-digit count correctly', () => {
        const { screen } = renderBadge({ count: 42, position: 'top-left' });
        const topRow = rowText(screen, 0);
        expect(topRow).toContain('42');
    });

    it('shows 99+ when count exceeds 99', () => {
        const { screen } = renderBadge({ count: 100, position: 'top-left' });
        const topRow = rowText(screen, 0);
        expect(topRow).toContain('99+');
    });

    it('shows 99+ for very large counts', () => {
        const { screen } = renderBadge({ count: 9999, position: 'top-left' });
        const topRow = rowText(screen, 0);
        expect(topRow).toContain('99+');
    });

    it('shows exact count at boundary (99)', () => {
        const { screen } = renderBadge({ count: 99, position: 'top-left' });
        const topRow = rowText(screen, 0);
        expect(topRow).toContain('99');
        // Should NOT contain 99+
        expect(topRow).not.toContain('99+');
    });

    it('renders at top-right corner', () => {
        const { screen } = renderBadge({ count: 7, position: 'top-right' }, {}, 20, 5);
        // "7" is 1 char wide, should appear at column 19 (width - 1)
        expect(screen.back[0][19].char).toBe('7');
        expect(screen.back[0][19].bg).toEqual({ type: 'named', name: 'red' });
    });

    it('renders at top-left corner', () => {
        const { screen } = renderBadge({ count: 7, position: 'top-left' }, {}, 20, 5);
        expect(screen.back[0][0].char).toBe('7');
        expect(screen.back[0][0].bg).toEqual({ type: 'named', name: 'red' });
    });

    it('renders at bottom-right corner', () => {
        const { screen } = renderBadge({ count: 7, position: 'bottom-right' }, {}, 20, 5);
        // Bottom row is row 4 (height - 1), column 19 (width - 1)
        expect(screen.back[4][19].char).toBe('7');
        expect(screen.back[4][19].bg).toEqual({ type: 'named', name: 'red' });
    });

    it('renders at bottom-left corner', () => {
        const { screen } = renderBadge({ count: 7, position: 'bottom-left' }, {}, 20, 5);
        // Bottom row is row 4 (height - 1), column 0
        expect(screen.back[4][0].char).toBe('7');
        expect(screen.back[4][0].bg).toEqual({ type: 'named', name: 'red' });
    });

    it('setCount marks widget dirty', () => {
        const badge = new NotificationBadge({ count: 1 });
        badge.clearDirty();
        badge.setCount(5);
        expect(badge.isDirty).toBe(true);
        expect(badge.getCount()).toBe(5);
    });

    it('setPosition marks widget dirty', () => {
        const badge = new NotificationBadge({ count: 1 });
        badge.clearDirty();
        badge.setPosition('bottom-left');
        expect(badge.isDirty).toBe(true);
        expect(badge.getPosition()).toBe('bottom-left');
    });

    it('handles zero-size rect without error', () => {
        expect(() => renderBadge({ count: 5 }, {}, 0, 0)).not.toThrow();
    });

    it('defaults to top-right position', () => {
        const badge = new NotificationBadge({ count: 3 });
        expect(badge.getPosition()).toBe('top-right');
    });
});
