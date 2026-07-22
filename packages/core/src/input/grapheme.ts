// Grapheme splitting helper
import { segmenter } from "../utils/unicode.js";

export const splitGraphemes = (str: string): string[] => {
    return Array.from(segmenter.segment(str), s => s.segment);
};

