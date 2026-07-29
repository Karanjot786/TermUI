// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for unicode utilities
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { stringWidth, truncate, stripAnsi, wordWrap } from '../utils/unicode.js';

describe('stringWidth', () => {
    it('measures regular ASCII text', () => {
        expect(stringWidth('hello')).toBe(5);
        expect(stringWidth('')).toBe(0);
        expect(stringWidth(' ')).toBe(1);
    });

    it('measures CJK characters as 2 columns', () => {
        expect(stringWidth('你好')).toBe(4);
        expect(stringWidth('a你b')).toBe(4); // 1+2+1
    });

    it('ignores ANSI escape sequences', () => {
        expect(stringWidth('\x1b[31mhello\x1b[0m')).toBe(5);
        expect(stringWidth('\x1b[1;34mtest\x1b[0m')).toBe(4);
    });

    it('ignores control characters', () => {
        expect(stringWidth('\n')).toBe(0);
        expect(stringWidth('\t')).toBe(0);
    });

    it('handles empty strings', () => {
        expect(stringWidth('')).toBe(0);
    });
});

describe('truncate', () => {
    it('returns original string if within width', () => {
        expect(truncate('hello', 10)).toBe('hello');
    });

    it('truncates with ellipsis', () => {
        expect(truncate('hello world', 8)).toBe('hello w…');
    });

    it('handles zero width', () => {
        expect(truncate('hello', 0)).toBe('');
    });

    it('handles width 1', () => {
        expect(truncate('hello', 1)).toBe('…');
    });

    it('preserves ANSI codes when truncating', () => {
        const result = truncate('\x1b[31mhello world\x1b[0m', 8);
        expect(result).toContain('\x1b[31m');
    });

    it('appends ANSI reset when truncating text with ANSI styling', () => {
        const result = truncate('\x1b[31mhello world\x1b[0m', 8);
        expect(result.endsWith('\x1b[0m')).toBe(true);
    });
});

describe('stripAnsi', () => {
    it('removes ANSI color codes', () => {
        expect(stripAnsi('\x1b[31mhello\x1b[0m')).toBe('hello');
    });

    it('removes multiple ANSI codes', () => {
        expect(stripAnsi('\x1b[1m\x1b[34mtest\x1b[0m')).toBe('test');
    });

    it('returns plain text unchanged', () => {
        expect(stripAnsi('hello')).toBe('hello');
    });
});

describe('wordWrap', () => {
    it('wraps long text at word boundaries', () => {
        expect(wordWrap('hello world foo', 11)).toBe('hello world\nfoo');
    });

    it('preserves existing newlines', () => {
        expect(wordWrap('a\nb', 80)).toBe('a\nb');
    });

    it('does nothing for short text', () => {
        expect(wordWrap('hi', 10)).toBe('hi');
    });

    it('breaks very long words', () => {
        const result = wordWrap('abcdefghij', 5);
        expect(result.split('\n').every(l => stringWidth(l) <= 5)).toBe(true);
    });

    it('safely breaks long words containing ANSI escape sequences without premature wrapping', () => {
        const styledWord = '\x1b[31mabcdefghij\x1b[0m';
        const result = wordWrap(styledWord, 5);
        const lines = result.split('\n');
        expect(lines.length).toBe(2);
        expect(stringWidth(lines[0]!)).toBe(5);
        expect(stringWidth(lines[1]!)).toBe(5);
        expect(lines[0]!).toContain('\x1b[31m');
    });

    it('preserves style state across wraps and resets at the end of each wrapped line', () => {
        const input = '\x1b[31mHello 🚀 你好 World\x1b[0m';
        const result = wordWrap(input, 5);
        const lines = result.split('\n');
        expect(lines.length).toBe(4);
        
        // Line 1: 'Hello' (red)
        expect(lines[0]).toBe('\x1b[31mHello\x1b[0m');
        // Line 2: '🚀 ' (red)
        expect(lines[1]).toBe('\x1b[31m🚀 \x1b[0m');
        // Line 3: '你好 ' (red)
        expect(lines[2]).toBe('\x1b[31m你好 \x1b[0m');
        // Line 4: 'World' (red)
        expect(lines[3]).toBe('\x1b[31mWorld\x1b[0m');
    });

    it('safely wraps wide characters and emojis at wrap boundaries without splitting them', () => {
        const input = '🚀你好';
        // Width is 4. '🚀' (width 2) and '你' (width 2) fit on line 1. '好' (width 2) goes to line 2.
        const result = wordWrap(input, 4);
        const lines = result.split('\n');
        expect(lines[0]).toBe('🚀你');
        expect(lines[1]).toBe('好');
    });

    it('does not insert a spurious empty line when a single character exceeds width', () => {
        const result = wordWrap('🚀', 1);
        const lines = result.split('\n');
        expect(lines).toEqual(['🚀']);
    });
});
