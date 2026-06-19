// ─────────────────────────────────────────────────────
// @termuijs/motion — Tests for Interpolation helpers
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mapRange, interpolate } from './interpolate.js';

describe('interpolate and mapRange', () => {
    it('maps a midpoint value', () => {
        expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
        expect(mapRange(0.5, 0, 1, 10, 20)).toBe(15);
    });

    it('clamps out-of-range input by default', () => {
        expect(mapRange(-5, 0, 10, 0, 100)).toBe(0);
        expect(mapRange(15, 0, 10, 0, 100)).toBe(100);
        // Descending output range
        expect(mapRange(15, 0, 10, 100, 0)).toBe(0);
        expect(mapRange(-5, 0, 10, 100, 0)).toBe(100);
    });

    it('extrapolates when clamp is false', () => {
        expect(mapRange(-5, 0, 10, 0, 100, { clamp: false })).toBe(-50);
        expect(mapRange(15, 0, 10, 0, 100, { clamp: false })).toBe(150);
        // Descending output range
        expect(mapRange(15, 0, 10, 100, 0, { clamp: false })).toBe(-50);
    });

    it('handles a zero-width input range', () => {
        expect(mapRange(5, 10, 10, 0, 100)).toBe(0);
        expect(mapRange(15, 10, 10, 50, 100)).toBe(50);
    });

    it('interpolate maps tuple ranges', () => {
        expect(interpolate(5, [0, 10], [0, 100])).toBe(50);
        expect(interpolate(15, [0, 10], [0, 100])).toBe(100);
        expect(interpolate(15, [0, 10], [0, 100], { clamp: false })).toBe(150);
    });

    it('interpolate maps multi-stop arrays', () => {
        // Example: Bouncing animation [0, 0.5, 1] -> [0, 10, 0]
        expect(interpolate(0, [0, 0.5, 1], [0, 10, 0])).toBe(0);
        expect(interpolate(0.25, [0, 0.5, 1], [0, 10, 0])).toBe(5);
        expect(interpolate(0.5, [0, 0.5, 1], [0, 10, 0])).toBe(10);
        expect(interpolate(0.75, [0, 0.5, 1], [0, 10, 0])).toBe(5);
        expect(interpolate(1, [0, 0.5, 1], [0, 10, 0])).toBe(0);
    });

    it('interpolate with multi-stop arrays and clamping', () => {
        // Clamped out of bounds
        expect(interpolate(-0.5, [0, 0.5, 1], [0, 10, 0])).toBe(0);
        expect(interpolate(1.5, [0, 0.5, 1], [0, 10, 0])).toBe(0);

        // No clamp out of bounds
        expect(interpolate(-0.5, [0, 0.5, 1], [0, 10, 0], { clamp: false })).toBe(-10);
        expect(interpolate(1.5, [0, 0.5, 1], [0, 10, 0], { clamp: false })).toBe(-10);
    });

    it('throws if lengths are mismatched or too small', () => {
        expect(() => interpolate(5, [0, 1], [0, 1, 2])).toThrow();
        expect(() => interpolate(5, [0], [0])).toThrow();
    });
});
