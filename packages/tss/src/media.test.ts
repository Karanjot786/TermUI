import { describe, it, expect } from 'vitest';
import { matchMedia } from './media.js';

describe('TSS Media Queries', () => {
    it('returns true for empty or undefined queries', () => {
        expect(matchMedia('', { cols: 80, rows: 24 })).toBe(true);
        expect(matchMedia('   ', { cols: 80, rows: 24 })).toBe(true);
    });

    it('evaluates min-width correctly', () => {
        expect(matchMedia('(min-width: 80)', { cols: 100, rows: 24 })).toBe(true);
        expect(matchMedia('(min-width: 80)', { cols: 80, rows: 24 })).toBe(true);
        expect(matchMedia('(min-width: 80)', { cols: 79, rows: 24 })).toBe(false);
    });

    it('evaluates max-width correctly', () => {
        expect(matchMedia('(max-width: 80)', { cols: 70, rows: 24 })).toBe(true);
        expect(matchMedia('(max-width: 80)', { cols: 80, rows: 24 })).toBe(true);
        expect(matchMedia('(max-width: 80)', { cols: 81, rows: 24 })).toBe(false);
    });

    it('evaluates min-height correctly', () => {
        expect(matchMedia('(min-height: 24)', { cols: 80, rows: 30 })).toBe(true);
        expect(matchMedia('(min-height: 24)', { cols: 80, rows: 24 })).toBe(true);
        expect(matchMedia('(min-height: 24)', { cols: 80, rows: 23 })).toBe(false);
    });

    it('evaluates max-height correctly', () => {
        expect(matchMedia('(max-height: 24)', { cols: 80, rows: 20 })).toBe(true);
        expect(matchMedia('(max-height: 24)', { cols: 80, rows: 24 })).toBe(true);
        expect(matchMedia('(max-height: 24)', { cols: 80, rows: 25 })).toBe(false);
    });

    it('evaluates chained conditions with "and"', () => {
        const query = '(min-width: 80) and (max-height: 30)';
        
        // Both true
        expect(matchMedia(query, { cols: 100, rows: 25 })).toBe(true);
        // Width false, height true
        expect(matchMedia(query, { cols: 70, rows: 25 })).toBe(false);
        // Width true, height false
        expect(matchMedia(query, { cols: 100, rows: 35 })).toBe(false);
        // Both false
        expect(matchMedia(query, { cols: 70, rows: 35 })).toBe(false);
    });

    it('handles varied spacing around operators gracefully', () => {
        expect(matchMedia('(  min-width  :  80 )   and   ( max-width : 100  )', { cols: 90, rows: 24 })).toBe(true);
    });

    it('returns false for unsupported or malformed features', () => {
        expect(matchMedia('(min-depth: 10)', { cols: 80, rows: 24 })).toBe(false);
        expect(matchMedia('min-width: 80', { cols: 80, rows: 24 })).toBe(false); // missing parentheses
        expect(matchMedia('(min-width: eighty)', { cols: 80, rows: 24 })).toBe(false); // NaN value
    });
});