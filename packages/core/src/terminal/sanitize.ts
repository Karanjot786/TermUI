/**
 * ANSI escape sequence sanitization utilities for terminal security.
 *
 * User-supplied text rendered to the terminal can contain ANSI escape
 * sequences that allow escape injection attacks — cursor movement, screen
 * clearing, arbitrary command execution (via certain terminal emulators),
 * visual spoofing, clipboard exfiltration (OSC 52), and more.
 *
 * These utilities provide defense-in-depth for all text paths.
 *
 * @module
 */

// Matches ESC-introduced sequences (longer matches first to prevent
// the single-char FE alternative from eating multi-char sequences):
//   ESC [ <params> <letter>            — CSI (SGR, cursor, clear, etc.)
//   ESC ] ... ST                        — OSC (title, clipboard, hyperlinks)
//   ESC P ... ST / ESC X ... ST         — DCS / SOS
//   ESC ^ ... ST / ESC _               — PM / APC
//   ESC ( | ) | # | ; | ? <chars>      — FE escape sequences (single char)
//   Bare ESC followed by any char      — catch-all for partial sequences
const ANSI_ESCAPE_RE =
    /\x1b(?:\[[0-9;<=>?]*[a-zA-Z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[PX^_][^\x1b]*\x1b\\|[@-Z\\-_]|.)/g;

// Matches bare C0 control characters (0x00–0x1F) except TAB (0x09) and LF (0x0A),
// plus DEL (0x7F) and C1 controls (0x80–0x9F). Includes CR (0x0D) — a bare CR
// lets untrusted text overwrite the current line when written to a real
// terminal, so it is not safe to let through.
const CONTROL_CHAR_RE = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/g;

// Same as CONTROL_CHAR_RE but excludes ESC (0x1B) — used by sanitizeForDisplay
// when formatting is allowed so that ESC in preserved SGR sequences is not stripped.
const CONTROL_NO_ESC_RE = /[\x00-\x08\x0b-\x1a\x1c-\x1f\x7f-\x9f]/g;

// Non-global variants for test() calls — avoids lastIndex state leak
const ANSI_ESCAPE_TEST_RE =
    /\x1b(?:\[[0-9;<=>?]*[a-zA-Z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[PX^_][^\x1b]*\x1b\\|[@-Z\\-_]|.)/;
const CONTROL_CHAR_TEST_RE = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/;

// Matches only cursor-movement, screen-clear, and other non-SGR CSI sequences,
// while allowing SGR (Select Graphic Rendition — ESC [ <params> m) through.
// CSI sequences ending in `m` are SGR — everything else is non-SGR.
// Parameter bytes: 0x30–0x3F (digits, semicolon, <=>?)
// Final bytes: 0x40–0x7E (all except `m` = 0x6D)
const NON_SGR_CSI_RE = /\x1b\[[0-9;<=>?]*[A-LN-Za-ln-z@\[\\\]^_\x60{|}~-]/g;

/**
 * Strip all ANSI escape sequences and dangerous control characters from a string.
 *
 * Removes:
 *  - All ESC-introduced sequences (CSI, OSC, DCS, SOS, PM, APC, etc.)
 *  - Bare C0 controls (0x00–0x1F) except TAB (0x09) and LF (0x0A)
 *  - DEL (0x7F) and C1 controls (0x80–0x9F)
 *
 * Safe for use on any user-supplied or file-read text before rendering.
 */
export function stripAnsiEscapes(text: string): string {
    if (typeof text !== 'string') return '';
    return text.replace(ANSI_ESCAPE_RE, '').replace(CONTROL_CHAR_RE, '');
}

/**
 * Return `true` if the string contains any ANSI escape sequences or
 * dangerous control characters.
 */
export function hasAnsiEscapes(text: string): boolean {
    if (typeof text !== 'string') return false;
    return ANSI_ESCAPE_TEST_RE.test(text) || CONTROL_CHAR_TEST_RE.test(text);
}

/**
 * Sanitize text for terminal display.
 *
 * When `allowFormatting` is `false` (default), ALL ANSI escapes are stripped —
 * identical to `stripAnsiEscapes`.
 *
 * When `allowFormatting` is `true`, SGR (Select Graphic Rendition) sequences
 * (e.g. `\x1b[31m` for red text, `\x1b[1m` for bold) are preserved, but all
 * other CSI commands (cursor movement, screen clear, scroll, etc.) and all
 * OSC sequences (window title, clipboard, hyperlinks) are stripped.  This is
 * suitable for display of trusted formatted text, such as log output from a
 * program that uses colors.
 */
export function sanitizeForDisplay(text: string, allowFormatting = false): string {
    if (typeof text !== 'string') return '';

    if (!allowFormatting) {
        return stripAnsiEscapes(text);
    }

    // Strip non-SGR CSI sequences (cursor movement, clear, scroll, etc.)
    let out = text.replace(NON_SGR_CSI_RE, '');
    // Strip all OSC, DCS, SOS, PM, APC sequences
    out = out.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '');
    out = out.replace(/\x1b[PX^_][^\x1b]*\x1b\\/g, '');
    // Strip bare C0 controls (keep TAB, LF) and C1/DEL — excludes ESC (0x1B)
    // so that ESC in preserved SGR sequences is not stripped.
    out = out.replace(CONTROL_NO_ESC_RE, '');
    // Strip bare ESC that isn't followed by `[` (the start of an SGR sequence)
    out = out.replace(/\x1b(?!\[)/g, '');

    return out;
}
