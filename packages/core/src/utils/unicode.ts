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
    const hasAnsi = str.includes('\x1b');
    const resetSeq = hasAnsi ? '\x1b[0m' : '';

    if (targetW <= 0) return ellipsis.slice(0, maxWidth) + resetSeq;
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
    return result + ellipsis + resetSeq;
}

/**
 * Strip all ANSI escape sequences from a string.
 */
export function stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Word-wrap text to a given width, respecting existing newlines.
 * Safely handles ANSI escape sequences without breaking formatting.
 */
class AnsiState {
    bold = false;
    dim = false;
    italic = false;
    underline = false;
    blink = false;
    inverse = false;
    strikethrough = false;
    fg: string | undefined = undefined;
    bg: string | undefined = undefined;

    reset(): void {
        this.bold = false;
        this.dim = false;
        this.italic = false;
        this.underline = false;
        this.blink = false;
        this.inverse = false;
        this.strikethrough = false;
        this.fg = undefined;
        this.bg = undefined;
    }

    update(sequence: string): void {
        if (!sequence.startsWith('\x1b[') || !sequence.endsWith('m')) {
            return;
        }
        const content = sequence.slice(2, -1);
        if (content === '') {
            this.reset();
            return;
        }
        const codes = content.split(';');
        for (let i = 0; i < codes.length; i++) {
            const code = codes[i];
            const num = parseInt(code, 10);
            if (isNaN(num)) continue;

            if (num === 0) {
                this.reset();
            } else if (num === 1) {
                this.bold = true;
            } else if (num === 2) {
                this.dim = true;
            } else if (num === 3) {
                this.italic = true;
            } else if (num === 4) {
                this.underline = true;
            } else if (num === 5) {
                this.blink = true;
            } else if (num === 7) {
                this.inverse = true;
            } else if (num === 9) {
                this.strikethrough = true;
            } else if (num === 22) {
                this.bold = false;
                this.dim = false;
            } else if (num === 23) {
                this.italic = false;
            } else if (num === 24) {
                this.underline = false;
            } else if (num === 25) {
                this.blink = false;
            } else if (num === 27) {
                this.inverse = false;
            } else if (num === 29) {
                this.strikethrough = false;
            } else if (num === 39) {
                this.fg = undefined;
            } else if (num === 49) {
                this.bg = undefined;
            } else if ((num >= 30 && num <= 37) || (num >= 90 && num <= 97)) {
                this.fg = code;
            } else if ((num >= 40 && num <= 47) || (num >= 100 && num <= 107)) {
                this.bg = code;
            } else if (num === 38) {
                if (codes[i + 1] === '5' && codes[i + 2] !== undefined) {
                    this.fg = `38;5;${codes[i + 2]}`;
                    i += 2;
                } else if (codes[i + 1] === '2' && codes[i + 2] !== undefined && codes[i + 3] !== undefined && codes[i + 4] !== undefined) {
                    this.fg = `38;2;${codes[i + 2]};${codes[i + 3]};${codes[i + 4]}`;
                    i += 4;
                }
            } else if (num === 48) {
                if (codes[i + 1] === '5' && codes[i + 2] !== undefined) {
                    this.bg = `48;5;${codes[i + 2]}`;
                    i += 2;
                } else if (codes[i + 1] === '2' && codes[i + 2] !== undefined && codes[i + 3] !== undefined && codes[i + 4] !== undefined) {
                    this.bg = `48;2;${codes[i + 2]};${codes[i + 3]};${codes[i + 4]}`;
                    i += 4;
                }
            }
        }
    }

    getAsString(): string {
        const parts: string[] = [];
        if (this.bold) parts.push('1');
        if (this.dim) parts.push('2');
        if (this.italic) parts.push('3');
        if (this.underline) parts.push('4');
        if (this.blink) parts.push('5');
        if (this.inverse) parts.push('7');
        if (this.strikethrough) parts.push('9');
        if (this.fg !== undefined) parts.push(this.fg);
        if (this.bg !== undefined) parts.push(this.bg);

        if (parts.length === 0) return '';
        return `\x1b[${parts.join(';')}m`;
    }
}

function updateAnsiState(text: string, ansiState: AnsiState): void {
    const segments = segmenter.segment(text);
    let inEscape = false;
    let escapeBuffer = '';
    for (const { segment } of segments) {
        const cp = segment.codePointAt(0)!;
        if (cp === 0x1B) {
            inEscape = true;
            escapeBuffer += segment;
            continue;
        }
        if (inEscape) {
            escapeBuffer += segment;
            if ((cp >= 0x40 && cp <= 0x7E) && cp !== 0x5B) {
                inEscape = false;
                ansiState.update(escapeBuffer);
                escapeBuffer = '';
            }
            continue;
        }
    }
}

/**
 * Word-wrap text to a given width, respecting existing newlines.
 * Safely handles ANSI escape sequences without breaking formatting.
 */
export function wordWrap(str: string, width: number): string {
    if (width <= 0) return str;
    const lines = str.split(/\r?\n/);
    const result: string[] = [];
    const ansiState = new AnsiState();

    for (const line of lines) {
        const tokens = line.split(/([^\S\r\n]+)/);
        let currentLine = ansiState.getAsString();
        let currentWidth = 0;

        for (const token of tokens) {
            if (!token) continue;

            if (/^[^\S\r\n]+$/.test(token)) {
                const tokenW = stringWidth(token);
                if (currentWidth + tokenW <= width) {
                    currentLine += token;
                    currentWidth += tokenW;
                    updateAnsiState(token, ansiState);
                }
            } else {
                const tokenW = stringWidth(token);
                if (currentWidth + tokenW <= width) {
                    currentLine += token;
                    currentWidth += tokenW;
                    updateAnsiState(token, ansiState);
                } else if (tokenW > width) {
                    // Break long word
                    if (currentWidth > 0) {
                        if (ansiState.getAsString()) {
                            currentLine += '\x1b[0m';
                        }
                        result.push(currentLine);
                        currentLine = ansiState.getAsString();
                        currentWidth = 0;
                    }
                    const wordSegments = segmenter.segment(token);
                    let inEscape = false;
                    let escapeBuffer = '';
                    for (const { segment } of wordSegments) {
                        const cp = segment.codePointAt(0)!;
                        if (cp === 0x1B) {
                            inEscape = true;
                            escapeBuffer += segment;
                            currentLine += segment;
                            continue;
                        }
                        if (inEscape) {
                            escapeBuffer += segment;
                            currentLine += segment;
                            if ((cp >= 0x40 && cp <= 0x7E) && cp !== 0x5B) {
                                inEscape = false;
                                ansiState.update(escapeBuffer);
                                escapeBuffer = '';
                            }
                            continue;
                        }
                        const charW = segmentWidth(segment);
                        if (currentWidth + charW > width) {
                            if (currentWidth > 0) {
                                if (ansiState.getAsString()) {
                                    currentLine += '\x1b[0m';
                                }
                                result.push(currentLine);
                                currentLine = ansiState.getAsString();
                                currentWidth = 0;
                            }
                        }
                        currentLine += segment;
                        currentWidth += charW;
                    }
                } else {
                    // Start new line with this word
                    if (ansiState.getAsString()) {
                        currentLine += '\x1b[0m';
                    }
                    result.push(currentLine);
                    const trimmedToken = token.trimStart();
                    currentLine = ansiState.getAsString() + trimmedToken;
                    currentWidth = stringWidth(trimmedToken);
                    updateAnsiState(trimmedToken, ansiState);
                }
            }
        }
        if (ansiState.getAsString()) {
            currentLine += '\x1b[0m';
        }
        result.push(currentLine);
    }

    return result.join('\n');
}
