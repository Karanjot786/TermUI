import { describe, it, expect } from 'vitest';
import {
    splitRect,
    length,
    percentage,
    ratio,
    min,
    max,
    fill,
} from './ConstraintLayout.js';
import type { Rect } from './Rect.js';

describe('ConstraintLayout Factories', () => {
    it('creates correct constraint objects', () => {
        expect(length(10)).toEqual({ type: 'length', value: 10 });
        expect(percentage(50)).toEqual({ type: 'percentage', value: 50 });
        expect(ratio(1, 3)).toEqual({ type: 'ratio', num: 1, den: 3 });
        expect(min(5)).toEqual({ type: 'min', value: 5 });
        expect(max(15)).toEqual({ type: 'max', value: 15 });
        expect(fill(2)).toEqual({ type: 'fill', weight: 2 });
        expect(fill()).toEqual({ type: 'fill', weight: 1 });
    });
});

describe('ConstraintLayout splitRect', () => {
    const baseRect: Rect = { x: 0, y: 0, width: 100, height: 100 };

    it('returns empty array when constraints are empty', () => {
        expect(splitRect(baseRect, [])).toEqual([]);
    });

    it('splits vertically by default', () => {
        const results = splitRect(baseRect, [length(20), length(30)]);
        expect(results).toHaveLength(2);
        
        expect(results[0]).toEqual({ x: 0, y: 0, width: 100, height: 20 });
        expect(results[1]).toEqual({ x: 0, y: 20, width: 100, height: 30 });
    });

    it('splits horizontally when specified', () => {
        const results = splitRect(baseRect, [length(20), length(30)], 'horizontal');
        expect(results).toHaveLength(2);
        
        expect(results[0]).toEqual({ x: 0, y: 0, width: 20, height: 100 });
        expect(results[1]).toEqual({ x: 20, y: 0, width: 30, height: 100 });
    });

    it('handles percentage constraints', () => {
        const results = splitRect(baseRect, [percentage(25), percentage(50)]);
        expect(results[0].height).toBe(25);
        expect(results[1].height).toBe(50);
    });

    it('handles ratio constraints', () => {
        const results = splitRect(baseRect, [ratio(1, 4), ratio(2, 5)]);
        // 1/4 of 100 = 25
        // 2/5 of 100 = 40
        expect(results[0].height).toBe(25);
        expect(results[1].height).toBe(40);
    });

    it('handles division by zero in ratio constraint gracefully', () => {
        const results = splitRect(baseRect, [ratio(1, 0), length(50)]);
        expect(results[0].height).toBe(0);
        expect(results[1].height).toBe(50);
    });

    it('handles min and max constraints', () => {
        const results = splitRect(baseRect, [min(30), max(40)]);
        expect(results[0].height).toBe(30);
        expect(results[1].height).toBe(40);
    });

    it('distributes remaining space to fill constraints', () => {
        const results = splitRect(baseRect, [length(40), fill(1), fill(2)]);
        // Remaining space: 100 - 40 = 60
        // Weights: 1 + 2 = 3
        // fill(1) gets: 60 * 1 / 3 = 20
        // fill(2) gets: 60 * 2 / 3 = 40
        expect(results[0].height).toBe(40);
        expect(results[1].height).toBe(20);
        expect(results[2].height).toBe(40);
    });

    it('distributes leftover pixels to the last fill constraint', () => {
        const results = splitRect({ ...baseRect, height: 10 }, [fill(1), fill(1), fill(1)]);
        // Available space: 10
        // Weights: 1 + 1 + 1 = 3
        // Each gets 10 * 1 / 3 = 3
        // Remaining: 1 pixel. Goes to the last fill constraint.
        expect(results[0].height).toBe(3);
        expect(results[1].height).toBe(3);
        expect(results[2].height).toBe(4);
    });

    it('respects gaps between resolved rectangles', () => {
        const results = splitRect(baseRect, [length(20), fill(), length(20)], 'vertical', 5);
        // Gaps: 2 gaps of 5 = 10
        // Available space for constraints: 100 - 10 = 90
        // length(20) -> 20
        // length(20) -> 20
        // Remaining for fill(): 90 - 40 = 50
        // Offsets:
        // rect0: y=0, height=20
        // rect1: y=20+5=25, height=50
        // rect2: y=25+50+5=80, height=20
        expect(results[0]).toEqual({ x: 0, y: 0, width: 100, height: 20 });
        expect(results[1]).toEqual({ x: 0, y: 25, width: 100, height: 50 });
        expect(results[2]).toEqual({ x: 0, y: 80, width: 100, height: 20 });
    });

    it('clamps size so total doesn\'t exceed available space', () => {
        const results = splitRect(baseRect, [length(70), length(50)]);
        // Available: 100
        // First gets 70
        // Second requests 50, but clamped to remaining 30
        expect(results[0].height).toBe(70);
        expect(results[1].height).toBe(30);
    });

    it('handles zero width/height input rectangle gracefully', () => {
        const zeroRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
        const results = splitRect(zeroRect, [length(10), fill()]);
        expect(results[0]).toEqual({ x: 0, y: 0, width: 0, height: 0 });
        expect(results[1]).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
});
