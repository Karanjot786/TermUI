// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Constraint-based Layout
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    length,
    percentage,
    ratio,
    min,
    max,
    fill,
    splitRect,
} from './ConstraintLayout.js';
import type { Rect } from './Rect.js';

describe('ConstraintLayout', () => {
    describe('Constraint Factories', () => {
        it('creates length constraint', () => {
            expect(length(5)).toEqual({ type: 'length', value: 5 });
        });

        it('creates percentage constraint', () => {
            expect(percentage(50)).toEqual({ type: 'percentage', value: 50 });
        });

        it('creates ratio constraint', () => {
            expect(ratio(1, 3)).toEqual({ type: 'ratio', num: 1, den: 3 });
        });

        it('creates min constraint', () => {
            expect(min(10)).toEqual({ type: 'min', value: 10 });
        });

        it('creates max constraint', () => {
            expect(max(20)).toEqual({ type: 'max', value: 20 });
        });

        it('creates fill constraint', () => {
            expect(fill()).toEqual({ type: 'fill', weight: 1 });
            expect(fill(3)).toEqual({ type: 'fill', weight: 3 });
        });
    });

    describe('splitRect', () => {
        const area: Rect = { x: 10, y: 5, width: 100, height: 50 };

        it('returns empty array if no constraints provided', () => {
            expect(splitRect(area, [])).toEqual([]);
        });

        it('splits vertically by default', () => {
            const results = splitRect(area, [length(10), length(20)]);
            expect(results).toHaveLength(2);
            
            // Vertical split divides height, width remains the same
            expect(results[0]).toEqual({ x: 10, y: 5, width: 100, height: 10 });
            expect(results[1]).toEqual({ x: 10, y: 15, width: 100, height: 20 });
        });

        it('splits horizontally if specified', () => {
            const results = splitRect(area, [length(10), length(20)], 'horizontal');
            expect(results).toHaveLength(2);
            
            // Horizontal split divides width, height remains the same
            expect(results[0]).toEqual({ x: 10, y: 5, width: 10, height: 50 });
            expect(results[1]).toEqual({ x: 20, y: 5, width: 20, height: 50 });
        });

        it('respects gaps in horizontal split', () => {
            const results = splitRect(area, [length(10), length(20)], 'horizontal', 5);
            expect(results).toHaveLength(2);
            
            // Gap is 5. Result 0 starts at x: 10, width 10. Next starts at x: 10 + 10 (size) + 5 (gap) = 25.
            expect(results[0]).toEqual({ x: 10, y: 5, width: 10, height: 50 });
            expect(results[1]).toEqual({ x: 25, y: 5, width: 20, height: 50 });
        });

        it('resolves percentage constraints', () => {
            // width: 100
            const results = splitRect(area, [percentage(30), percentage(40)], 'horizontal');
            expect(results[0].width).toBe(30);
            expect(results[1].width).toBe(40);
        });

        it('resolves ratio constraints', () => {
            const results = splitRect(area, [ratio(1, 4), ratio(2, 5)], 'horizontal');
            // ratio(1, 4) of 100 is 25
            // ratio(2, 5) of 100 is 40
            expect(results[0].width).toBe(25);
            expect(results[1].width).toBe(40);
        });

        it('handles zero denominator in ratio constraints safely', () => {
            const results = splitRect(area, [ratio(1, 0)], 'horizontal');
            expect(results[0].width).toBe(0);
        });

        it('resolves min constraints', () => {
            const results = splitRect(area, [min(40)], 'horizontal');
            expect(results[0].width).toBe(40);
        });

        it('resolves max constraints', () => {
            // max is capped at value or available
            const results1 = splitRect(area, [max(30)], 'horizontal');
            expect(results1[0].width).toBe(30);

            const results2 = splitRect(area, [max(120)], 'horizontal');
            expect(results2[0].width).toBe(100); // capped at available
        });

        it('resolves fill constraints and distributes remaining space', () => {
            const results = splitRect(area, [length(20), fill(), fill()], 'horizontal');
            // Available: 100. Length: 20. Remaining: 80.
            // Two fill constraints with default weight 1.
            // Each gets 40.
            expect(results[0].width).toBe(20);
            expect(results[1].width).toBe(40);
            expect(results[2].width).toBe(40);
        });

        it('resolves fill constraints with custom weights proportionally', () => {
            const results = splitRect(area, [length(40), fill(1), fill(2)], 'horizontal');
            // Available: 100. Length: 40. Remaining: 60.
            // Weight sum = 3.
            // First fill: 60 * 1 / 3 = 20.
            // Second fill: 60 * 2 / 3 = 40.
            expect(results[0].width).toBe(40);
            expect(results[1].width).toBe(20);
            expect(results[2].width).toBe(40);
        });

        it('distributes leftover pixels to the last fill constraint', () => {
            const results = splitRect(area, [fill(1), fill(1), fill(1)], 'horizontal');
            // Available: 100. 100 / 3 = 33. Leftover: 1.
            // Last fill gets the leftover pixel: 33 + 1 = 34.
            expect(results[0].width).toBe(33);
            expect(results[1].width).toBe(33);
            expect(results[2].width).toBe(34);
        });

        it('clamps layout so total does not exceed available space', () => {
            const results = splitRect(area, [length(70), length(50)], 'horizontal');
            // Available: 100.
            // First gets 70. Remaining available: 30.
            // Second gets clamped to 30.
            expect(results[0].width).toBe(70);
            expect(results[1].width).toBe(30);
        });
    });
});
