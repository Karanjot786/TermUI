import { describe, it, expect } from 'vitest';
import { lighten, darken, alpha, evalColorFunction } from './color-functions.js';

describe('lighten', () => {
    it('lightens a hex color by percentage', () => {
        const result = lighten('#336699', '20%');
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
        // lightened color has higher RGB values than original
        const r = parseInt(result.slice(1, 3), 16);
        expect(r).toBeGreaterThan(0x33);
    });

    it('lightens a hex color by decimal amount', () => {
        const result = lighten('#000000', 0.5);
        expect(result).toBe('#808080');
    });

    it('returns original color for invalid hex', () => {
        expect(lighten('notacolor', '10%')).toBe('notacolor');
    });
});

describe('darken', () => {
    it('darkens a hex color by percentage', () => {
        const result = darken('#336699', '20%');
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
        const r = parseInt(result.slice(1, 3), 16);
        expect(r).toBeLessThan(0x33);
    });

    it('darkens a hex color by decimal amount', () => {
        const result = darken('#ffffff', 1);
        expect(result).toBe('#000000');
    });

    it('returns original color for invalid hex', () => {
        expect(darken('notacolor', '10%')).toBe('notacolor');
    });
});

describe('alpha', () => {
    it('sets alpha on a hex color', () => {
        const result = alpha('#000000', 0.5);
        expect(result).toBe('rgba(0, 0, 0, 0.5)');
    });

    it('accepts percentage string for alpha', () => {
        const result = alpha('#ffffff', '50%');
        expect(result).toBe('rgba(255, 255, 255, 0.5)');
    });

    it('returns original color for invalid hex', () => {
        expect(alpha('notacolor', 0.5)).toBe('notacolor');
    });
});

describe('evalColorFunction', () => {
    it('evaluates lighten() function call', () => {
        const result = evalColorFunction('lighten(#336699, 20%)');
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('evaluates darken() function call', () => {
        const result = evalColorFunction('darken(#336699, 20%)');
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('evaluates alpha() function call', () => {
        const result = evalColorFunction('alpha(#000000, 0.5)');
        expect(result).toBe('rgba(0, 0, 0, 0.5)');
    });

    it('returns value unchanged if not a color function', () => {
        expect(evalColorFunction('#336699')).toBe('#336699');
        expect(evalColorFunction('cyan')).toBe('cyan');
    });

    it('evaluates color function calls with surrounding whitespace', () => {
        const result = evalColorFunction('  lighten(#000000, 0.5)  ');
        expect(result).toBe('#808080');
    });
});