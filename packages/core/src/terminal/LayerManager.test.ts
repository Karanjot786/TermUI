// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for LayerManager
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { LayerManager } from './LayerManager.js';

describe('LayerManager — Hit Testing', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('a single region hit-tests to its widget id', () => {
        const lm = new LayerManager(20, 10);
        lm.clearHitGrid();
        lm.setHitRegion('btn', 2, 2, 5, 1, 0);

        expect(lm.hitTest(3, 2)).toBe('btn');
        expect(lm.hitTest(2, 2)).toBe('btn');
        expect(lm.hitTest(6, 2)).toBe('btn');
    });

    it('two overlapping regions resolve to the higher z', () => {
        const lm = new LayerManager(20, 10);
        lm.clearHitGrid();

        // Register lower z-index region first
        lm.setHitRegion('bg', 0, 0, 10, 10, 0);

        // Register higher z-index region overlapping it
        lm.setHitRegion('dialog', 3, 3, 4, 4, 10);

        expect(lm.hitTest(1, 1)).toBe('bg');
        expect(lm.hitTest(4, 4)).toBe('dialog');
        expect(lm.hitTest(3, 3)).toBe('dialog');
        expect(lm.hitTest(6, 6)).toBe('dialog');
        expect(lm.hitTest(7, 7)).toBe('bg');
    });

    it('equal z-index overlapping regions resolve to the last written region', () => {
        const lm = new LayerManager(20, 10);
        lm.clearHitGrid();

        lm.setHitRegion('widgetA', 2, 2, 3, 3, 5);
        lm.setHitRegion('widgetB', 3, 3, 3, 3, 5);

        // Overlapping at (3, 3), (3, 4), (4, 3), (4, 4)
        expect(lm.hitTest(2, 2)).toBe('widgetA');
        expect(lm.hitTest(3, 3)).toBe('widgetB');
        expect(lm.hitTest(4, 4)).toBe('widgetB');
    });

    it('a cell outside all regions returns null', () => {
        const lm = new LayerManager(20, 10);
        lm.clearHitGrid();
        lm.setHitRegion('btn', 2, 2, 5, 1, 0);

        expect(lm.hitTest(0, 0)).toBeNull();
        expect(lm.hitTest(1, 2)).toBeNull();
        expect(lm.hitTest(7, 2)).toBeNull();
        expect(lm.hitTest(2, 3)).toBeNull();
    });

    it('out-of-bounds coordinates return null', () => {
        const lm = new LayerManager(20, 10);
        lm.clearHitGrid();
        lm.setHitRegion('btn', 2, 2, 5, 1, 0);

        expect(lm.hitTest(-1, 2)).toBeNull();
        expect(lm.hitTest(20, 2)).toBeNull();
        expect(lm.hitTest(2, -1)).toBeNull();
        expect(lm.hitTest(2, 10)).toBeNull();
    });

    it('clearHitGrid removes all ownership', () => {
        const lm = new LayerManager(20, 10);
        lm.clearHitGrid();
        lm.setHitRegion('btn', 2, 2, 5, 1, 0);

        expect(lm.hitTest(3, 2)).toBe('btn');

        lm.clearHitGrid();
        expect(lm.hitTest(3, 2)).toBeNull();
    });

    it('resize reallocates the hit grids without affecting layer compositing', () => {
        const lm = new LayerManager(20, 10);
        lm.clearHitGrid();
        lm.setHitRegion('btn', 2, 2, 5, 1, 0);

        expect(lm.hitTest(3, 2)).toBe('btn');

        lm.resize(30, 15);
        expect(lm.cols).toBe(30);
        expect(lm.rows).toBe(15);
        // The old region is cleared after resize reallocation
        expect(lm.hitTest(3, 2)).toBeNull();

        // Write a new region within the new boundary and verify it works
        lm.setHitRegion('btn-new', 25, 12, 2, 2, 5);
        expect(lm.hitTest(26, 13)).toBe('btn-new');
    });
});


import { Screen } from './Screen.js';

describe('LayerManager - Layer Operations', () => {
    it('creates a layer', () => {
        const lm = new LayerManager(10, 10);

        const layer = lm.createLayer('modal', 100);

        expect(layer.id).toBe('modal');
        expect(layer.zIndex).toBe(100);
        expect(lm.hasLayer('modal')).toBe(true);
    });

    it('removes a layer', () => {
        const lm = new LayerManager(10, 10);

        lm.createLayer('modal', 100);

        expect(lm.hasLayer('modal')).toBe(true);

        lm.removeLayer('modal');

        expect(lm.hasLayer('modal')).toBe(false);
    });

    it('sorts layers by zIndex', () => {
        const lm = new LayerManager(10, 10);

        lm.createLayer('top', 100);
        lm.createLayer('base', 0);
        lm.createLayer('middle', 50);

        const sorted = lm.getSortedLayers();

        expect(sorted[0].id).toBe('base');
        expect(sorted[1].id).toBe('middle');
        expect(sorted[2].id).toBe('top');
    });

    it('does not return invisible layers', () => {
        const lm = new LayerManager(10, 10);

        const layer = lm.createLayer('hidden', 100);
        layer.visible = false;

        expect(lm.getSortedLayers()).toHaveLength(0);
    });
});

describe('LayerManager - Cell Writing', () => {
    it('writes a cell to a layer', () => {
        const lm = new LayerManager(10, 10);

        const layer = lm.createLayer('base', 0);

        lm.setCell('base', 2, 3, {
            char: 'A',
        });

        expect(layer.cells[3][2].char).toBe('A');
    });

    it('writes strings to a layer', () => {
        const lm = new LayerManager(20, 10);

        const layer = lm.createLayer('base', 0);

        lm.writeString('base', 0, 0, 'ABC');

        expect(layer.cells[0][0].char).toBe('A');
        expect(layer.cells[0][1].char).toBe('B');
        expect(layer.cells[0][2].char).toBe('C');
    });
});

describe('LayerManager - Dirty Region', () => {
    it('creates dirty region after first write', () => {
        const lm = new LayerManager(10, 10);

        const layer = lm.createLayer('base', 0);

        lm.setCell('base', 2, 3, {
            char: 'A',
        });

        expect(layer.dirtyRegion).toEqual({
            x: 2,
            y: 3,
            width: 1,
            height: 1,
        });
    });

    it('expands dirty region correctly', () => {
        const lm = new LayerManager(10, 10);

        const layer = lm.createLayer('base', 0);

        lm.setCell('base', 2, 2, {
            char: 'A',
        });

        lm.setCell('base', 5, 5, {
            char: 'B',
        });

        expect(layer.dirtyRegion).toEqual({
            x: 2,
            y: 2,
            width: 4,
            height: 4,
        });
    });
});

describe('LayerManager - Compositing', () => {
    it('composites layer cells onto the screen', () => {
        const lm = new LayerManager(10, 10);

        lm.createLayer('base', 0);

        lm.setCell('base', 1, 1, {
            char: 'X',
        });

        const screen = new Screen(10, 10);

        lm.composite(screen);

        expect(screen.back[1][1].char).toBe('X');
    });

    it('higher z-index layer wins during composite', () => {
        const lm = new LayerManager(10, 10);

        lm.createLayer('bottom', 0);
        lm.createLayer('top', 100);

        lm.setCell('bottom', 1, 1, {
            char: 'A',
        });

        lm.setCell('top', 1, 1, {
            char: 'B',
        });

        const screen = new Screen(10, 10);

        lm.composite(screen);

        expect(screen.back[1][1].char).toBe('B');
    });
});

describe('LayerManager - Resize', () => {
    it('resizes layer grids', () => {
        const lm = new LayerManager(10, 10);

        const layer = lm.createLayer('base', 0);

        lm.resize(20, 15);

        expect(lm.cols).toBe(20);
        expect(lm.rows).toBe(15);

        expect(layer.cells.length).toBe(15);
        expect(layer.cells[0].length).toBe(20);
    });

    it('clears dirty regions on resize', () => {
        const lm = new LayerManager(10, 10);

        const layer = lm.createLayer('base', 0);

        lm.setCell('base', 1, 1, {
            char: 'A',
        });

        expect(layer.dirtyRegion).not.toBeNull();

        lm.resize(20, 15);

        expect(layer.dirtyRegion).toBeNull();
    });
});
