import { describe, it, expect } from 'vitest';
import { sanitizeText } from '../index.js';

describe('ANSI Escape Sequence Security Tests', () => {
    describe('sanitizeText', () => {
        it('strips all ANSI escapes by default (SGR, CSI, OSC, etc.)', () => {
            const malicious = '\x1b[31mred\x1b[0m\x1b[2J\x1b[?25l\x1b]52;c;bad\x07evil';
            const clean = sanitizeText(malicious);
            expect(clean).toBe('redevil');
        });

        it('allows SGR but blocks dangerous escapes when formatting is enabled', () => {
            const SGR_only = '\x1b[31mred\x1b[0m';
            expect(sanitizeText(SGR_only, true)).toBe(SGR_only);

            const mixed = '\x1b[31mred\x1b[0m\x1b[2J\x1b]52;c;bad\x07evil';
            const sanitized = sanitizeText(mixed, true);
            expect(sanitized).toBe('\x1b[31mred\x1b[0mevil');
            expect(sanitized).not.toContain('\x1b[2J');
            expect(sanitized).not.toContain('\x1b]52');
        });
    });
});
