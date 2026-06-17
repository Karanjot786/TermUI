import { describe, it, expect } from 'vitest';
import {
    emptyRect,
    containsPoint,
    shrinkRect,
    intersectRect,
    unionRect,
} from './Rect.js';

describe('Rect Utilities', () => {
    describe('emptyRect', () => {
        it('returns a rect at origin with zero dimensions', () => {
            expect(emptyRect()).toEqual({ x: 0, y: 0, width: 0, height: 0 });
        });
    });

    describe('containsPoint', () => {
        const rect = { x: 10, y: 20, width: 50, height: 40 };

        it('returns true for points inside the rectangle', () => {
            expect(containsPoint(rect, 15, 25)).toBe(true);
            expect(containsPoint(rect, 35, 40)).toBe(true);
        });

        it('returns true for top-left boundaries (inclusive)', () => {
            expect(containsPoint(rect, 10, 20)).toBe(true);
            expect(containsPoint(rect, 10, 30)).toBe(true);
            expect(containsPoint(rect, 30, 20)).toBe(true);
        });

        it('returns false for bottom-right boundaries (exclusive)', () => {
            expect(containsPoint(rect, 60, 60)).toBe(false);
            expect(containsPoint(rect, 60, 40)).toBe(false);
            expect(containsPoint(rect, 30, 60)).toBe(false);
        });

        it('returns false for points completely outside the rectangle', () => {
            expect(containsPoint(rect, 0, 0)).toBe(false);
            expect(containsPoint(rect, 100, 100)).toBe(false);
        });
    });

    describe('shrinkRect', () => {
        const rect = { x: 10, y: 10, width: 100, height: 100 };

        it('correctly shrinks the rectangle from all sides', () => {
            expect(shrinkRect(rect, 10, 20, 30, 40)).toEqual({
                x: 50,
                y: 20,
                width: 40, // 100 - 40 - 20 = 40
                height: 60, // 100 - 10 - 30 = 60
            });
        });

        it('clamps negative dimensions to zero', () => {
            expect(shrinkRect(rect, 60, 60, 60, 60)).toEqual({
                x: 70,
                y: 70,
                width: 0,
                height: 0,
            });
        });
    });

    describe('intersectRect', () => {
        const a = { x: 10, y: 10, width: 50, height: 50 };

        it('returns the intersection of overlapping rectangles', () => {
            const b = { x: 30, y: 30, width: 50, height: 50 };
            expect(intersectRect(a, b)).toEqual({
                x: 30,
                y: 30,
                width: 30,
                height: 30,
            });
        });

        it('returns null for disjoint/non-overlapping rectangles', () => {
            const b = { x: 100, y: 100, width: 50, height: 50 };
            expect(intersectRect(a, b)).toBeNull();
        });

        it('returns null for edge-touching boundaries', () => {
            const b = { x: 60, y: 10, width: 50, height: 50 };
            expect(intersectRect(a, b)).toBeNull();
        });
    });

    describe('unionRect', () => {
        it('returns the bounding rect of two intersecting rectangles', () => {
            const a = { x: 10, y: 10, width: 40, height: 40 };
            const b = { x: 30, y: 30, width: 40, height: 40 };
            expect(unionRect(a, b)).toEqual({
                x: 10,
                y: 10,
                width: 60,
                height: 60,
            });
        });

        it('returns the bounding rect of two disjoint rectangles', () => {
            const a = { x: 10, y: 10, width: 20, height: 20 };
            const b = { x: 50, y: 50, width: 20, height: 20 };
            expect(unionRect(a, b)).toEqual({
                x: 10,
                y: 10,
                width: 60,
                height: 60,
            });
        });
    });
});
