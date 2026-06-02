// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Center widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Center } from './Center.js';
import { Box } from '../display/Box.js';
import { Text } from '../display/Text.js';
import { Screen, computeLayout } from '@termuijs/core';

describe('Center widget', () => {
    it('axis: x - Child is horizontally centered within parent width', () => {
        const parent = new Center({ width: 40, height: 10, alignItems: 'flex-start' }, { horizontal: true, vertical: false });
        const child = new Box({ width: 10, height: 4, bg: { type: 'named', name: 'red' } });
        parent.addChild(child);

        const node = parent.getLayoutNode();
        computeLayout(node, 40, 10);
        parent.syncLayout();

        const screen = new Screen(40, 10);
        parent.render(screen);

        // Expected horizontal center: Math.floor((40 - 10) / 2) = 15
        // Expected vertical offset: 0 (since vertical centering is disabled)
        // Verify child rendering region is background red
        expect(screen.back[0][15].bg).toEqual({ type: 'named', name: 'red' });
        expect(screen.back[0][24].bg).toEqual({ type: 'named', name: 'red' });
        expect(screen.back[3][15].bg).toEqual({ type: 'named', name: 'red' });
        expect(screen.back[3][24].bg).toEqual({ type: 'named', name: 'red' });

        // Areas outside should not be red
        expect(screen.back[0][14].bg).not.toEqual({ type: 'named', name: 'red' });
        expect(screen.back[0][25].bg).not.toEqual({ type: 'named', name: 'red' });
        expect(screen.back[4][15].bg).not.toEqual({ type: 'named', name: 'red' });
    });

    it('axis: y - Child is vertically centered within parent height', () => {
        const parent = new Center({ width: 40, height: 10, alignItems: 'flex-start' }, { horizontal: false, vertical: true });
        const child = new Box({ width: 10, height: 4, bg: { type: 'named', name: 'blue' } });
        parent.addChild(child);

        const node = parent.getLayoutNode();
        computeLayout(node, 40, 10);
        parent.syncLayout();

        const screen = new Screen(40, 10);
        parent.render(screen);

        // Expected vertical center: Math.floor((10 - 4) / 2) = 3
        // Expected horizontal offset: 0 (since horizontal centering is disabled)
        // Verify child rendering region is background blue
        expect(screen.back[3][0].bg).toEqual({ type: 'named', name: 'blue' });
        expect(screen.back[3][9].bg).toEqual({ type: 'named', name: 'blue' });
        expect(screen.back[6][0].bg).toEqual({ type: 'named', name: 'blue' });
        expect(screen.back[6][9].bg).toEqual({ type: 'named', name: 'blue' });

        // Areas outside should not be blue
        expect(screen.back[2][0].bg).not.toEqual({ type: 'named', name: 'blue' });
        expect(screen.back[7][0].bg).not.toEqual({ type: 'named', name: 'blue' });
        expect(screen.back[3][10].bg).not.toEqual({ type: 'named', name: 'blue' });
    });

    it('axis: both - Child is centered on both axes', () => {
        const parent = new Center({ width: 40, height: 10, alignItems: 'flex-start' }, { horizontal: true, vertical: true });
        const child = new Box({ width: 10, height: 4, bg: { type: 'named', name: 'green' } });
        parent.addChild(child);

        const node = parent.getLayoutNode();
        computeLayout(node, 40, 10);
        parent.syncLayout();

        const screen = new Screen(40, 10);
        parent.render(screen);

        // Expected horizontal center: Math.floor((40 - 10) / 2) = 15
        // Expected vertical center: Math.floor((10 - 4) / 2) = 3
        expect(screen.back[3][15].bg).toEqual({ type: 'named', name: 'green' });
        expect(screen.back[3][24].bg).toEqual({ type: 'named', name: 'green' });
        expect(screen.back[6][15].bg).toEqual({ type: 'named', name: 'green' });
        expect(screen.back[6][24].bg).toEqual({ type: 'named', name: 'green' });

        // Areas outside should not be green
        expect(screen.back[2][15].bg).not.toEqual({ type: 'named', name: 'green' });
        expect(screen.back[7][15].bg).not.toEqual({ type: 'named', name: 'green' });
        expect(screen.back[3][14].bg).not.toEqual({ type: 'named', name: 'green' });
        expect(screen.back[3][25].bg).not.toEqual({ type: 'named', name: 'green' });
    });

    it('Single character child centered in a 40x10 screen', () => {
        // Parent takes full screen size
        const parent = new Center({ width: 40, height: 10, alignItems: 'flex-start' });
        const child = new Text('A', { width: 1, height: 1 });
        parent.addChild(child);

        const node = parent.getLayoutNode();
        computeLayout(node, 40, 10);
        parent.syncLayout();

        const screen = new Screen(40, 10);
        parent.render(screen);

        // Expected coordinates:
        // x: Math.floor((40 - 1) / 2) = 19
        // y: Math.floor((10 - 1) / 2) = 4
        expect(screen.back[4][19].char).toBe('A');

        // Check surrounding cells to ensure they are empty
        expect(screen.back[4][18].char).toBe(' ');
        expect(screen.back[4][20].char).toBe(' ');
        expect(screen.back[3][19].char).toBe(' ');
        expect(screen.back[5][19].char).toBe(' ');
    });
});
