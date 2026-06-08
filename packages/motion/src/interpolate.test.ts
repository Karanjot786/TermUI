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
});
