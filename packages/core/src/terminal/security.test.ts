import { describe, it, expect } from 'vitest';
import { sanitizeText, Screen } from '../index.js';
import { Text } from '../../../widgets/src/display/Text.js';

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

    describe('Text Component Layout Boundary Protection', () => {
        it('default rendering of Text sanitizes content to prevent layout injection', () => {
            // A malicious string that tries to clear the screen and move the cursor
            const maliciousContent = 'safe\x1b[2J\x1b[5;5Hhidden';
            const text = new Text(maliciousContent, {}, { wrap: false });
            const screen = new Screen(20, 5);
            text.updateRect({ x: 0, y: 0, width: 20, height: 5 });
            text.render(screen);

            // With default auto-sanitizing, it should render "safehidden" within the text cells,
            // and NOT execute cursor movement or clear screen codes.
            const cells = screen.back[0];
            const renderedString = cells.map(c => c.char).join('').trimEnd();
            expect(renderedString).toBe('safehidden');
        });

        it('dangerouslySetRawAnsi property state check', () => {
            // Test that the class correctly exposes the raw ANSI property logic
            const text = new Text('test', {}, { dangerouslySetRawAnsi: true });
            class TestText extends Text {
                public testSanitize(t: string) {
                    return this.sanitize(t);
                }
            }
            const testText = new TestText('test', {}, { dangerouslySetRawAnsi: true });
            expect(testText.testSanitize('\x1b[2Jhello')).toBe('\x1b[2Jhello');
        });
    });
});
