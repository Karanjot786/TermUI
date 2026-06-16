// ─────────────────────────────────────────────────────
// @termuijs/core — Key mapping constants
// ─────────────────────────────────────────────────────

import { caps } from '../terminal/env-caps.js';

/**
 * Maps raw byte sequences to human-readable key names.
 * These are standard VT100/xterm escape sequences.
 */
export const ESCAPE_SEQUENCES: Record<string, string> = {
    // Arrow keys
    '\x1b[A': 'up',
    '\x1b[B': 'down',
    '\x1b[C': 'right',
    '\x1b[D': 'left',

    // Shift+Arrow
    '\x1b[1;2A': 'shift+up',
    '\x1b[1;2B': 'shift+down',
    '\x1b[1;2C': 'shift+right',
    '\x1b[1;2D': 'shift+left',

    // Ctrl+Arrow
    '\x1b[1;5A': 'ctrl+up',
    '\x1b[1;5B': 'ctrl+down',
    '\x1b[1;5C': 'ctrl+right',
    '\x1b[1;5D': 'ctrl+left',

    // Alt+Arrow
    '\x1b[1;3A': 'alt+up',
    '\x1b[1;3B': 'alt+down',
    '\x1b[1;3C': 'alt+right',
    '\x1b[1;3D': 'alt+left',

    // Home/End/Insert/Delete/PageUp/PageDown
    '\x1b[H': 'home',
    '\x1b[F': 'end',
    '\x1b[2~': 'insert',
    '\x1b[3~': 'delete',
    '\x1b[5~': 'pageup',
    '\x1b[6~': 'pagedown',

    // Alternate Home/End (some terminals)
    '\x1b[1~': 'home',
    '\x1b[4~': 'end',
    '\x1bOH': 'home',
    '\x1bOF': 'end',

    // Function keys
    '\x1bOP': 'f1',
    '\x1bOQ': 'f2',
    '\x1bOR': 'f3',
    '\x1bOS': 'f4',
    '\x1b[15~': 'f5',
    '\x1b[17~': 'f6',
    '\x1b[18~': 'f7',
    '\x1b[19~': 'f8',
    '\x1b[20~': 'f9',
    '\x1b[21~': 'f10',
    '\x1b[23~': 'f11',
    '\x1b[24~': 'f12',

    // Special keys
    '\x1b[Z': 'shift+tab',
};

/**
 * Maps control character codes (0x01-0x1A) to key names.
 * Ctrl+A = 0x01, Ctrl+B = 0x02, ... Ctrl+Z = 0x1A
 */
export const CTRL_KEYS: Record<number, string> = {
    0x01: 'a', 0x02: 'b', 0x03: 'c', 0x04: 'd',
    0x05: 'e', 0x06: 'f', 0x07: 'g', 0x08: 'backspace',
    0x09: 'tab', 0x0A: 'enter', 0x0B: 'k', 0x0C: 'l',
    0x0D: 'enter', 0x0E: 'n', 0x0F: 'o', 0x10: 'p',
    0x11: 'q', 0x12: 'r', 0x13: 's', 0x14: 't',
    0x15: 'u', 0x16: 'v', 0x17: 'w', 0x18: 'x',
    0x19: 'y', 0x1A: 'z',
};

/**
 * Special single-byte key codes.
 */
export const SPECIAL_KEYS: Record<number, string> = {
    0x1B: 'escape',
    0x7F: 'backspace',
    0x09: 'tab',
    0x0D: 'enter',
    0x0A: 'enter',
    0x20: 'space',
};

/**
 * Normalizes navigation key names based on the active keybinding mode.
 * Useful for mapping vim (j/k/h/l) or emacs (ctrl+n/ctrl+p) keys to standard
 * arrow key intents (up/down/left/right).
 * 
 * @param keyName The raw key name from KeyEvent.name
 * @returns The normalized directional key name, or the original key name
 */
export function normalizeNavigationKey(keyName: string): string {
    const mode = caps.keybindingMode;
    
    if (mode === 'vim') {
        if (keyName === 'k') return 'up';
        if (keyName === 'j') return 'down';
        if (keyName === 'h') return 'left';
        if (keyName === 'l') return 'right';
    } else if (mode === 'emacs') {
        if (keyName === 'ctrl+p') return 'up';
        if (keyName === 'ctrl+n') return 'down';
    }
    
    return keyName;
}
