// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Border utilities
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getBorderChars, borderSize } from './Border.js';

describe('getBorderChars', () => {
    it('returns correct chars for single border', () => {
        const chars = getBorderChars('single');
        expect(chars).toMatchObject({ topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘' });
    });

    it('returns rounded corners for round border', () => {
        const chars = getBorderChars('round');
        expect(chars).toMatchObject({ topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯' });
    });

    it('returns null for none border', () => {
        expect(getBorderChars('none')).toBeNull();
    });

    it('returns double-line chars for double border', () => {
        const chars = getBorderChars('double');
        expect(chars).toMatchObject({ topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝' });
    });

    it('returns ASCII chars when asciiOnly is enabled', () => {
        const chars = getBorderChars('single', undefined, true);

        expect(chars).toMatchObject({
            topLeft: '+',
            top: '-',
            topRight: '+',
            right: '|',
            bottomRight: '+',
            bottom: '-',
            bottomLeft: '+',
            left: '|',
        });
    });
});

describe('borderSize', () => {
    it('returns 2x2 for single border', () => {
        expect(borderSize('single')).toEqual({ horizontal: 2, vertical: 2 });
    });

    it('returns 0x0 for none border', () => {
        expect(borderSize('none')).toEqual({ horizontal: 0, vertical: 0 });
    });
});
