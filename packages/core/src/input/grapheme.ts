// Grapheme splitting helper
export const splitGraphemes = (str: string): string[] => {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(str), s => s.segment);
};
