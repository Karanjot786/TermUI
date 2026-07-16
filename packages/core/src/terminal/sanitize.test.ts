import { describe, it, expect } from 'vitest';
import { stripAnsiEscapes, hasAnsiEscapes, sanitizeForDisplay } from './sanitize.js';

describe('stripAnsiEscapes', () => {
    it('strips CSI SGR color sequences', () => {
        expect(stripAnsiEscapes('\x1b[31mhello\x1b[0m')).toBe('hello');
    });

    it('strips CSI cursor movement', () => {
        expect(stripAnsiEscapes('\x1b[2J')).toBe('');
        expect(stripAnsiEscapes('\x1b[5B')).toBe('');
        expect(stripAnsiEscapes('\x1b[?25l')).toBe('');
    });

    it('strips OSC sequences (window title)', () => {
        expect(stripAnsiEscapes('\x1b]0;My App\x07')).toBe('');
    });

    it('strips OSC sequences with ST terminator', () => {
        expect(stripAnsiEscapes('\x1b]8;;https://example.com\x1b\\')).toBe('');
    });

    it('strips OSC 52 clipboard sequences', () => {
        expect(stripAnsiEscapes('\x1b]52;c;dGVzdA==\x07')).toBe('');
    });

    it('strips DCS sequences', () => {
        expect(stripAnsiEscapes('\x1bPsome data\x1b\\')).toBe('');
    });

    it('strips bare C0 controls except TAB and LF', () => {
        expect(stripAnsiEscapes('ab\x00\x01\x07cd')).toBe('abcd');
    });

    it('preserves TAB and LF', () => {
        expect(stripAnsiEscapes('a\tb\nc')).toBe('a\tb\nc');
    });

    it('strips C1 controls and DEL', () => {
        expect(stripAnsiEscapes('ab\x7f\x80\x9bcd')).toBe('abcd');
    });

    it('preserves normal text unchanged', () => {
        expect(stripAnsiEscapes('Hello, World!')).toBe('Hello, World!');
    });

    it('preserves Unicode and emoji', () => {
        expect(stripAnsiEscapes('你好，世界 🌍')).toBe('你好，世界 🌍');
    });

    it('handles empty strings', () => {
        expect(stripAnsiEscapes('')).toBe('');
    });

    it('handles non-string input', () => {
        expect(stripAnsiEscapes(undefined as unknown as string)).toBe('');
        expect(stripAnsiEscapes(null as unknown as string)).toBe('');
    });

    it('strips mixed text and sequences', () => {
        const input = 'Hello\x1b[1m World\x1b[0m\x1b[2J!';
        expect(stripAnsiEscapes(input)).toBe('Hello World!');
    });
});

describe('hasAnsiEscapes', () => {
    it('returns true for CSI sequences', () => {
        expect(hasAnsiEscapes('\x1b[31mtest')).toBe(true);
    });

    it('returns true for OSC sequences', () => {
        expect(hasAnsiEscapes('\x1b]0;title\x07')).toBe(true);
    });

    it('returns true for bare C0 controls', () => {
        expect(hasAnsiEscapes('ab\x00cd')).toBe(true);
    });

    it('returns false for clean text', () => {
        expect(hasAnsiEscapes('Hello, World!')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(hasAnsiEscapes('')).toBe(false);
    });

    it('returns false for Unicode without escapes', () => {
        expect(hasAnsiEscapes('你好 🌍')).toBe(false);
    });
});

describe('sanitizeForDisplay', () => {
    describe('without formatting (default)', () => {
        it('strips all ANSI escapes', () => {
            expect(sanitizeForDisplay('\x1b[31mhello\x1b[0m')).toBe('hello');
        });

        it('strips cursor movement', () => {
            expect(sanitizeForDisplay('\x1b[2Jclear')).toBe('clear');
        });
    });

    describe('with formatting allowed', () => {
        it('preserves SGR sequences', () => {
            const result = sanitizeForDisplay('\x1b[31mred\x1b[0m', true);
            expect(result).toBe('\x1b[31mred\x1b[0m');
        });

        it('preserves combined SGR parameters', () => {
            const result = sanitizeForDisplay('\x1b[1;31mbold red\x1b[0m', true);
            expect(result).toBe('\x1b[1;31mbold red\x1b[0m');
        });

        it('strips cursor movement while preserving SGR', () => {
            const result = sanitizeForDisplay('\x1b[31mred\x1b[2Jclear\x1b[0m', true);
            // Should keep SGR but strip cursor clear
            expect(result).not.toContain('\x1b[2J');
            expect(result).toContain('\x1b[31m');
            expect(result).toContain('\x1b[0m');
        });

        it('strips OSC sequences', () => {
            const result = sanitizeForDisplay('\x1b]0;title\x07\x1b[31mred\x1b[0m', true);
            expect(result).toBe('\x1b[31mred\x1b[0m');
        });

        it('strips OSC 52 clipboard sequences', () => {
            const result = sanitizeForDisplay('\x1b]52;c;dGVzdA==\x07\x1b[33myellow\x1b[0m', true);
            expect(result).toBe('\x1b[33myellow\x1b[0m');
        });

        it('strips screen clear sequence', () => {
            const result = sanitizeForDisplay('\x1b[2Jtext', true);
            expect(result).toBe('text');
        });

        it('strips cursor up sequence', () => {
            const result = sanitizeForDisplay('\x1b[3Atext', true);
            expect(result).toBe('text');
        });

        it('strips scroll region sequence', () => {
            const result = sanitizeForDisplay('\x1b[5;10rtext', true);
            expect(result).toBe('text');
        });

        it('strips C0 controls but keeps TAB and LF', () => {
            const result = sanitizeForDisplay('\x00\x01a\tb\nc\x7f', true);
            expect(result).toBe('a\tb\nc');
        });

        it('handles empty string', () => {
            expect(sanitizeForDisplay('', true)).toBe('');
        });

        it('handles non-string input', () => {
            expect(sanitizeForDisplay(undefined as unknown as string, true)).toBe('');
            expect(sanitizeForDisplay(null as unknown as string, true)).toBe('');
        });
    });
});
