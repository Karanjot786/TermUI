// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Breadcrumbs widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs.js';
import { Screen, caps } from '@termuijs/core';

afterEach(() => {
    vi.restoreAllMocks();
});

function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

describe('Breadcrumbs', () => {
    it('renders all segments with separators', () => {
        const bc = new Breadcrumbs(['Home', 'Docs', 'API']);
        const screen = new Screen(40, 1);
        bc.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        bc.render(screen);

        const row = rowText(screen, 0);
        expect(row).toContain('Home');
        expect(row).toContain('Docs');
        expect(row).toContain('API');
        const sep = caps.unicode ? '❯' : '>';
        expect(row).toContain(` ${sep} `);
    });

    it('last segment renders in the active color', () => {
        const bc = new Breadcrumbs(['Home', 'API'], {}, { activeColor: { type: 'named', name: 'yellow' } });
        const screen = new Screen(40, 1);
        bc.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        bc.render(screen);

        // "Home ❯ API"
        // Let's find 'A'
        const aCell = screen.back[0].find(c => c.char === 'A');
        expect(aCell).toBeDefined();
        expect(aCell!.fg).toEqual({ type: 'named', name: 'yellow' });
    });

    it('narrow width truncates leading segments to an ellipsis', () => {
        const bc = new Breadcrumbs(['Home', 'Docs', 'API']);
        const screen = new Screen(15, 1);
        bc.updateRect({ x: 0, y: 0, width: 15, height: 1 });
        bc.render(screen);

        const row = rowText(screen, 0);
        expect(row).not.toContain('Home');
        const ellipsis = caps.unicode ? '…' : '...';
        expect(row).toContain(ellipsis);
        expect(row).toContain('API');
    });

    it('setSegments replaces the rendered output', () => {
        const bc = new Breadcrumbs(['A', 'B']);
        const screen = new Screen(40, 1);
        bc.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        
        bc.setSegments(['X', 'Y']);
        bc.render(screen);

        const row = rowText(screen, 0);
        expect(row).toContain('X');
        expect(row).toContain('Y');
        expect(row).not.toContain('A');
    });

    it('ASCII fallback separator renders when caps.unicode is false', async () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const { Breadcrumbs } = await import('./Breadcrumbs.js');
        
        const bc = new Breadcrumbs(['A', 'B']);
        const screen = new Screen(40, 1);
        bc.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        bc.render(screen);

        const row = rowText(screen, 0);
        expect(row).toContain('A > B');
        expect(row).not.toContain('❯');
    });

    it('uses custom separator when provided', () => {
        const bc = new Breadcrumbs(['A', 'B'], {}, { separator: '/' });
        const screen = new Screen(40, 1);
        bc.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        bc.render(screen);

        const row = rowText(screen, 0);
        expect(row).toContain('A / B');
    });

    it('does not mark dirty when setSegments receives identical segments', () => {
        const bc = new Breadcrumbs(['Home', 'Docs', 'API']);

        bc.clearDirty();

        bc.setSegments(['Home', 'Docs', 'API']);

        expect(bc.isDirty).toBe(false);
    });

    it('marks dirty when setSegments receives different segments', () => {
        const bc = new Breadcrumbs(['Home', 'Docs', 'API']);

        bc.clearDirty();

        bc.setSegments(['Home', 'Guides', 'API']);

        expect(bc.isDirty).toBe(true);
    });

    it('does not overflow at width 1', () => {
        const bc = new Breadcrumbs(['Home', 'Docs', 'API']);
        const screen = new Screen(1, 1);

        bc.updateRect({ x: 0, y: 0, width: 1, height: 1 });

        expect(() => bc.render(screen)).not.toThrow();
    });

    it('does not overflow at width 2', () => {
        const bc = new Breadcrumbs(['Home', 'Docs', 'API']);
        const screen = new Screen(2, 1);

        bc.updateRect({ x: 0, y: 0, width: 2, height: 1 });

        expect(() => bc.render(screen)).not.toThrow();
    });

    it('renders part of final segment on extremely narrow widths', () => {
        const bc = new Breadcrumbs(['Home', 'Documentation']);
        const screen = new Screen(3, 1);

        bc.updateRect({ x: 0, y: 0, width: 3, height: 1 });
        bc.render(screen);

        const row = rowText(screen, 0);

        expect(row.length).toBeLessThanOrEqual(3);
    });
});
