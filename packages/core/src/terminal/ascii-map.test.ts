import { describe, it, expect } from 'vitest';
import { BOX, BRAILLE_SPIN, BLOCK } from './ascii-map.js';

describe('ascii-map terminal fallbacks', () => {
    it('defines expected BOX drawing character fallbacks', () => {
        expect(BOX['┌']).toBe('+');
        expect(BOX['┐']).toBe('+');
        expect(BOX['└']).toBe('+');
        expect(BOX['┘']).toBe('+');
        expect(BOX['─']).toBe('-');
        expect(BOX['│']).toBe('|');
        expect(BOX['┼']).toBe('+');
        expect(BOX['═']).toBe('=');
        expect(BOX['║']).toBe('|');
    });

    it('defines expected BRAILLE_SPIN frames', () => {
        expect(BRAILLE_SPIN).toEqual(['|', '/', '-', '\\']);
    });

    it('defines expected BLOCK progress elements', () => {
        expect(BLOCK.full).toBe('#');
        expect(BLOCK.empty).toBe(' ');
        expect(BLOCK.partial).toBe('-');
    });
});
