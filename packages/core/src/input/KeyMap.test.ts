// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for KeyMap constants
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { ESCAPE_SEQUENCES, CTRL_KEYS, SPECIAL_KEYS, normalizeNavigationKey } from './KeyMap.js';
import { caps } from '../terminal/env-caps.js';

describe('KeyMap constants', () => {
    it('ESCAPE_SEQUENCES contains correct mappings', () => {
        // Arrow keys
        expect(ESCAPE_SEQUENCES['\x1b[A']).toBe('up');
        expect(ESCAPE_SEQUENCES['\x1b[B']).toBe('down');
        expect(ESCAPE_SEQUENCES['\x1b[C']).toBe('right');
        expect(ESCAPE_SEQUENCES['\x1b[D']).toBe('left');

        // Shift+Arrow
        expect(ESCAPE_SEQUENCES['\x1b[1;2A']).toBe('shift+up');
        expect(ESCAPE_SEQUENCES['\x1b[1;2B']).toBe('shift+down');
        expect(ESCAPE_SEQUENCES['\x1b[1;2C']).toBe('shift+right');
        expect(ESCAPE_SEQUENCES['\x1b[1;2D']).toBe('shift+left');

        // Ctrl+Arrow
        expect(ESCAPE_SEQUENCES['\x1b[1;5A']).toBe('ctrl+up');
        expect(ESCAPE_SEQUENCES['\x1b[1;5B']).toBe('ctrl+down');
        expect(ESCAPE_SEQUENCES['\x1b[1;5C']).toBe('ctrl+right');
        expect(ESCAPE_SEQUENCES['\x1b[1;5D']).toBe('ctrl+left');

        // Alt+Arrow
        expect(ESCAPE_SEQUENCES['\x1b[1;3A']).toBe('alt+up');
        expect(ESCAPE_SEQUENCES['\x1b[1;3B']).toBe('alt+down');
        expect(ESCAPE_SEQUENCES['\x1b[1;3C']).toBe('alt+right');
        expect(ESCAPE_SEQUENCES['\x1b[1;3D']).toBe('alt+left');

        // Home/End/PageUp/PageDown
        expect(ESCAPE_SEQUENCES['\x1b[H']).toBe('home');
        expect(ESCAPE_SEQUENCES['\x1b[F']).toBe('end');
        expect(ESCAPE_SEQUENCES['\x1b[5~']).toBe('pageup');
        expect(ESCAPE_SEQUENCES['\x1b[6~']).toBe('pagedown');

        // Function keys
        expect(ESCAPE_SEQUENCES['\x1bOP']).toBe('f1');
        expect(ESCAPE_SEQUENCES['\x1b[15~']).toBe('f5');
        expect(ESCAPE_SEQUENCES['\x1b[24~']).toBe('f12');

        // Special key
        expect(ESCAPE_SEQUENCES['\x1b[Z']).toBe('shift+tab');
    });

    it('CTRL_KEYS contains correct mappings', () => {
        expect(CTRL_KEYS[0x01]).toBe('a');
        expect(CTRL_KEYS[0x08]).toBe('backspace');
        expect(CTRL_KEYS[0x09]).toBe('tab');
        expect(CTRL_KEYS[0x0A]).toBe('enter');
        expect(CTRL_KEYS[0x0D]).toBe('enter');
        expect(CTRL_KEYS[0x1A]).toBe('z');
    });

    it('SPECIAL_KEYS contains correct mappings', () => {
        expect(SPECIAL_KEYS[0x1B]).toBe('escape');
        expect(SPECIAL_KEYS[0x7F]).toBe('backspace');
        expect(SPECIAL_KEYS[0x09]).toBe('tab');
        expect(SPECIAL_KEYS[0x0D]).toBe('enter');
        expect(SPECIAL_KEYS[0x0A]).toBe('enter');
        expect(SPECIAL_KEYS[0x20]).toBe('space');
    });
});

describe('normalizeNavigationKey', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns unmodified keys by default', () => {
        vi.spyOn(caps, 'keybindingMode', 'get').mockReturnValue('default');

        expect(normalizeNavigationKey('up')).toBe('up');
        expect(normalizeNavigationKey('j')).toBe('j');
        expect(normalizeNavigationKey('ctrl+n')).toBe('ctrl+n');
    });

    it('maps vim keys to directions when in vim mode', () => {
        vi.spyOn(caps, 'keybindingMode', 'get').mockReturnValue('vim');

        expect(normalizeNavigationKey('k')).toBe('up');
        expect(normalizeNavigationKey('j')).toBe('down');
        expect(normalizeNavigationKey('h')).toBe('left');
        expect(normalizeNavigationKey('l')).toBe('right');

        // Unrelated keys should remain unchanged
        expect(normalizeNavigationKey('enter')).toBe('enter');
        expect(normalizeNavigationKey('up')).toBe('up');
    });

    it('maps emacs keys to directions when in emacs mode', () => {
        vi.spyOn(caps, 'keybindingMode', 'get').mockReturnValue('emacs');

        expect(normalizeNavigationKey('ctrl+p')).toBe('up');
        expect(normalizeNavigationKey('ctrl+n')).toBe('down');

        // Unrelated keys should remain unchanged
        expect(normalizeNavigationKey('j')).toBe('j');
        expect(normalizeNavigationKey('up')).toBe('up');
    });
});
