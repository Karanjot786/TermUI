// Grapheme splitting helper
const GRAPHEME_SEGMENTER = new Intl.Segmenter('en', { granularity: 'grapheme' });

export const splitGraphemes = (str: string): string[] => {
    return Array.from(GRAPHEME_SEGMENTER.segment(str), s => s.segment);
};
