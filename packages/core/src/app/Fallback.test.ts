// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Fallback static renderer
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shouldUseFallback, renderFallback } from './Fallback.js';
import { Screen } from '../terminal/Screen.js';

describe('Fallback', () => {
    describe('shouldUseFallback', () => {
        const originalEnv = { ...process.env };
        let isTTYDescriptor: PropertyDescriptor | undefined;

        beforeEach(() => {
            isTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
        });

        afterEach(() => {
            process.env = { ...originalEnv };
            if (isTTYDescriptor) {
                Object.defineProperty(process.stdout, 'isTTY', isTTYDescriptor);
            } else {
                delete (process.stdout as any).isTTY;
            }
        });

        it('returns true if stdout is not a TTY', () => {
            Object.defineProperty(process.stdout, 'isTTY', {
                value: false,
                configurable: true,
                writable: true,
            });
            expect(shouldUseFallback()).toBe(true);
        });

        it('returns true if CI environment variable is set', () => {
            Object.defineProperty(process.stdout, 'isTTY', {
                value: true,
                configurable: true,
                writable: true,
            });
            process.env['CI'] = 'true';
            expect(shouldUseFallback()).toBe(true);
        });

        it('returns true if TERM is dumb', () => {
            Object.defineProperty(process.stdout, 'isTTY', {
                value: true,
                configurable: true,
                writable: true,
            });
            delete process.env['CI'];
            process.env['TERM'] = 'dumb';
            expect(shouldUseFallback()).toBe(true);
        });

        it('returns false if stdout is TTY and environment variables are not setting fallback', () => {
            Object.defineProperty(process.stdout, 'isTTY', {
                value: true,
                configurable: true,
                writable: true,
            });
            delete process.env['CI'];
            delete process.env['TERM'];
            expect(shouldUseFallback()).toBe(false);
        });
    });

    describe('renderFallback', () => {
        it('renders an empty screen as an empty string', () => {
            const screen = new Screen(10, 5);
            expect(renderFallback(screen)).toBe('');
        });

        it('renders text and strips trailing spaces and trailing empty lines', () => {
            const screen = new Screen(10, 4);
            screen.writeString(0, 0, 'hello');
            screen.writeString(0, 1, 'world   ');
            screen.writeString(0, 2, '   '); // spaces only
            // row 3 remains empty cells
            
            // Expected output:
            // Line 0: "hello"
            // Line 1: "world"
            // Line 2: "" (since it gets trimmed)
            // Line 3: "" (removed as trailing empty line)
            // Final joined by '\n' with no trailing empty lines:
            // "hello\nworld"
            expect(renderFallback(screen)).toBe('hello\nworld');
        });

        it('handles wide CJK characters with continuation cells correctly', () => {
            const screen = new Screen(10, 2);
            screen.writeString(0, 0, '你好');
            // '你好' uses 4 cells:
            // back[0][0] = '你' (width 2)
            // back[0][1] = '' (width 0, continuation)
            // back[0][2] = '好' (width 2)
            // back[0][3] = '' (width 0, continuation)

            expect(renderFallback(screen)).toBe('你好');
        });
    });
});
