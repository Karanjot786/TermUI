import { describe, it, expect } from 'vitest';
import { splitGraphemes } from './grapheme.js';

describe('splitGraphemes', () => {
    it('splits plain ASCII strings into characters', () => {
        expect(splitGraphemes('hello')).toEqual(['h', 'e', 'l', 'l', 'o']);
    });

    it('splits skin-tone modifier emoji sequences as single graphemes', () => {
        // Wave emoji with medium skin tone
        expect(splitGraphemes('👋🏽')).toEqual(['👋🏽']);
        expect(splitGraphemes('hello👋🏽world')).toEqual(['h', 'e', 'l', 'l', 'o', '👋🏽', 'w', 'o', 'r', 'l', 'd']);
    });

    it('splits zero-width joiner (ZWJ) family emoji sequences as single graphemes', () => {
        // Family: Man, Woman, Girl, Boy
        const familyEmoji = '👨‍👩‍👧‍👦';
        expect(splitGraphemes(familyEmoji)).toEqual([familyEmoji]);
    });
});
