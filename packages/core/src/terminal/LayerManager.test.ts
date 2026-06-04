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
