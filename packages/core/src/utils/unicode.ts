// ─────────────────────────────────────────────────────
// @termuijs/core — Unicode string width utilities
// ─────────────────────────────────────────────────────

/**
 * Check if a code point is a CJK (East Asian Wide/Fullwidth) character.
 * These characters occupy 2 terminal columns.
 *
 * Covers: CJK Unified Ideographs, Hangul Syllables, Katakana, Fullwidth Latin, etc.
 */
function isWideChar(codePoint: number): boolean {
    return (
        // CJK Unified Ideographs (common Chinese/Japanese/Korean)
        (codePoint >= 0x4E00 && codePoint <= 0x9FFF) ||
        // CJK Unified Ideographs Extension A
        (codePoint >= 0x3400 && codePoint <= 0x4DBF) ||
        // CJK Compatibility Ideographs
        (codePoint >= 0xF900 && codePoint <= 0xFAFF) ||
        // Hangul Syllables
        (codePoint >= 0xAC00 && codePoint <= 0xD7AF) ||
        // Katakana
        (codePoint >= 0x30A0 && codePoint <= 0x30FF) ||
        // CJK Symbols and Punctuation
        (codePoint >= 0x3000 && codePoint <= 0x303F) ||
        // Hiragana
        (codePoint >= 0x3040 && codePoint <= 0x309F) ||
        // Fullwidth Forms
        (codePoint >= 0xFF01 && codePoint <= 0xFF60) ||
        (codePoint >= 0xFFE0 && codePoint <= 0xFFE6) ||
        // CJK Unified Ideographs Extension B
        (codePoint >= 0x20000 && codePoint <= 0x2A6DF) ||
        // CJK Unified Ideographs Extension C‑F
        (codePoint >= 0x2A700 && codePoint <= 0x2EBEF) ||
        // CJK Compatibility Ideographs Supplement
        (codePoint >= 0x2F800 && codePoint <= 0x2FA1F)
    );
}

/**
 * Check if a code point is a combining character (zero‑width).
 * These characters do not occupy any terminal column by themselves.
 */
function isCombining(codePoint: number): boolean {
    return (
        // Combining Diacritical Marks
        (codePoint >= 0x0300 && codePoint <= 0x036F) ||
        // Combining Diacritical Marks Extended
        (codePoint >= 0x1AB0 && codePoint <= 0x1AFF) ||
        // Combining Diacritical Marks Supplement
        (codePoint >= 0x1DC0 && codePoint <= 0x1DFF) ||
        // Combining Diacritical Marks for Symbols
        (codePoint >= 0x20D0 && codePoint <= 0x20FF) ||
        // Combining Half Marks
        (codePoint >= 0xFE20 && codePoint <= 0xFE2F) ||
        // Variation selectors
        (codePoint >= 0xFE00 && codePoint <= 0xFE0F) ||
        // Zero‑width joiner / non‑joiner
        codePoint === 0x200B || codePoint === 0x200C || codePoint === 0x200D ||
        codePoint === 0xFEFF
    );
}

/**
 * Check if a character is an emoji that typically occupies 2 columns.
 * Simplified heuristic covering common emoji ranges.
 */
function isEmoji(codePoint: number): boolean {
    return (
        // Emoticons
        (codePoint >= 0x1F600 && codePoint <= 0x1F64F) ||
        // Misc Symbols and Pictographs
        (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) ||
        // Transport and Map
        (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) ||
        // Supplemental Symbols
        (codePoint >= 0x1F900 && codePoint <= 0x1F9FF) ||
        // Misc symbols
        (codePoint >= 0x2600 && codePoint <= 0x26FF) ||
        // Dingbats
        (codePoint >= 0x2700 && codePoint <= 0x27BF) ||
        // Flags
        (codePoint >= 0x1F1E0 && codePoint <= 0x1F1FF)
    );
}

/**
 * Exported segmenter used throughout the module.
 */
export const segmenter = new Intl.Segmenter();

/**
 * Calculate the visual width of a single grapheme segment.
 */
export function segmentWidth(segment: string): number {
    const cp = segment.codePointAt(0)!;
    if (cp < 0x20 || (cp >= 0x7F && cp < 0xA0)) {
        return 0; // Control characters
    }
    if (isCombining(cp)) {
        return 0; // Combining
    }
    const charCount = [...segment].length;
    let isMultiCpWide = false;
    if (charCount > 1) {
        const cps = [...segment].map(c => c.codePointAt(0)!);
        isMultiCpWide = cps.slice(1).some(c => !isCombining(c));
    }
    if (isWideChar(cp) || isEmoji(cp) || isMultiCpWide) {
        return 2;
    }
    return 1;
}

/**
 * Calculate the visual width of a string in terminal columns.
 * Handles ANSI escape sequences and grapheme clusters.
 */
export function stringWidth(str: string): number {
    let width = 0;
    let inEscape = false;
    const segments = segmenter.segment(str);
    for (const { segment } of segments) {
        const cp = segment.codePointAt(0)!;
        // Skip ANSI escape sequences
        if (cp === 0x1B) { // ESC
            inEscape = true;
            continue;
        }
        if (inEscape) {
            // End of CSI sequence (letter after ESC[...m)
            if ((cp >= 0x40 && cp <= 0x7E) && cp !== 0x5B) {
                inEscape = false;
            }
            continue;
        }
        width += segmentWidth(segment);
    }
    return width;
}

/**
 * Truncate a string to the given visual width, preserving ANSI codes.
 * Appends an ellipsis character if truncated.
 */
export function truncate(str: string, maxWidth: number, ellipsis = '…'): string {
    if (maxWidth <= 0) return '';
    const strW = stringWidth(str);
    if (strW <= maxWidth) return str;
    const ellipsisW = stringWidth(ellipsis);
    const targetW = maxWidth - ellipsisW;
    if (targetW <= 0) return ellipsis.slice(0, maxWidth);
    let width = 0;
    let result = '';
    let inEscape = false;
    let escapeBuffer = '';
    const segments = segmenter.segment(str);
    for (const { segment } of segments) {
        const cp = segment.codePointAt(0)!;
        if (cp === 0x1B) { // ESC
            inEscape = true;
            escapeBuffer += segment;
            continue;
        }
        if (inEscape) {
            escapeBuffer += segment;
            if ((cp >= 0x40 && cp <= 0x7E) && cp !== 0x5B) {
                inEscape = false;
                result += escapeBuffer;
                escapeBuffer = '';
            }
            continue;
        }
        const charW = segmentWidth(segment);
        if (width + charW > targetW) break;
        width += charW;
        result += segment;
    }
    return result + ellipsis;
}

/**
 * Strip all ANSI escape sequences from a string.
 */
export function stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Word‑wrap text to a given width, respecting existing newlines.
 * Does not handle ANSI codes within words (wraps at the character level).
 */
export function wordWrap(str: string, width: number): string {
    if (width <= 0) return str;
    const lines = str.split('\n');
    const result: string[] = [];
    for (const line of lines) {
        if (stringWidth(line) <= width) {
            result.push(line);
            continue;
        }
        let currentLine = '';
        let currentWidth = 0;
        const words = line.split(/(\s+)/);
        for (const word of words) {
            const wordW = stringWidth(word);
            if (currentWidth + wordW <= width) {
                currentLine += word;
                currentWidth += wordW;
            } else if (wordW > width) {
                // Break long word
                if (currentLine) {
                    result.push(currentLine);
                    currentLine = '';
                    currentWidth = 0;
                }
                const wordSegments = segmenter.segment(word);
                for (const { segment } of wordSegments) {
                    const charW = segmentWidth(segment);
                    if (currentWidth + charW > width) {
                        if (currentLine) result.push(currentLine);
                        currentLine = '';
                        currentWidth = 0;
                    }
                    currentLine += segment;
                    currentWidth += charW;
                }
            } else {
                // Start new line with this word
                if (currentLine) result.push(currentLine);
                currentLine = word.trimStart();
                currentWidth = stringWidth(currentLine);
            }
        }
        if (currentLine) result.push(currentLine);
    }
    return result.join('\n');
}

