import { describe, it, expect } from 'vitest';
import { add, scale, lerp, distance, type Vec2 } from './vec2.js';

describe('Vec2 Motion Utilities', () => {
    describe('Happy Paths', () => {
        it('should correctly add two standard 2D vector coordinates together', () => {
            const v1: Vec2 = { x: 10, y: 20 };
            const v2: Vec2 = { x: 5, y: -5 };
            expect(add(v1, v2)).toEqual({ x: 15, y: 15 });
        });

        it('should correctly scale a vector coordinates by a factor metric', () => {
            const v: Vec2 = { x: 4, y: 5 };
            expect(scale(v, 2)).toEqual({ x: 8, y: 10 });
        });

        it('should linearly interpolate between two vectors at the midpoint timeline', () => {
            const v1: Vec2 = { x: 0, y: 0 };
            const v2: Vec2 = { x: 10, y: 20 };
            expect(lerp(v1, v2, 0.5)).toEqual({ x: 5, y: 10 });
        });

        it('should calculate precise Euclidean distances between vectors spaces', () => {
            const v1: Vec2 = { x: 0, y: 0 };
            const v2: Vec2 = { x: 3, y: 4 };
            expect(distance(v1, v2)).toBe(5);
        });
    });

    describe('Edge Cases & Boundaries', () => {
        it('should process boundary cases gracefully with zero vectors without blowing up', () => {
            const zeroVec: Vec2 = { x: 0, y: 0 };
            expect(add(zeroVec, zeroVec)).toEqual({ x: 0, y: 0 });
            expect(scale(zeroVec, 100)).toEqual({ x: 0, y: 0 });
            expect(distance(zeroVec, zeroVec)).toBe(0);
        });

        it('should handle zero-valued components correctly', () => {
            const components: Vec2 = { x: 0, y: 0 };
            expect(add(components, { x: 2, y: 2 })).toEqual({ x: 2, y: 2 });
            expect(scale(components, 5)).toEqual({ x: 0, y: 0 });
        });
    });
});