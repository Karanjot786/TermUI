/**
 * Core terminal utility functions for ANSI escape sequences.
 * Handles layout formatting, terminal bells, and notification configurations.
 */

// ─────────────────────────────────────────────────────
// @termuijs/core — ANSI escape sequence helpers
// ─────────────────────────────────────────────────────

/** CSI (Control Sequence Introducer) prefix */
export const CSI = '\x1b[';
/** OSC (Operating System Command) prefix */
export const OSC = '\x1b]';
/** ESC character */
export const ESC = '\x1b';

// ── Cursor Control ──────────────────────────────────

/** Hide the terminal cursor (DEC private mode 25). */
export const hideCursor = `${CSI}?25l`;
/** Show the terminal cursor (DEC private mode 25). */
export const showCursor = `${CSI}?25h`;
/** Save cursor position (SCO save). */
export const saveCursorPosition = `${CSI}s`;
/** Restore previously saved cursor position (SCO restore). */
export const restoreCursorPosition = `${CSI}u`;

export type CursorShape = 'block' | 'bar' | 'underline';

/** DECSCUSR: CSI Ps SP q. blink toggles steady vs blinking. */
export function cursorShape(shape: CursorShape, blink = true): string {
    const codes: Record<CursorShape, number> = {
        block: 1,
        underline: 3,
        bar: 5,
    };
    const code = codes[shape] + (blink ? 0 : 1);
    return `${CSI}${code} q`;
}

export function moveTo(col: number, row: number): string {
    return `${CSI}${row + 1};${col + 1}H`;
}

export function moveUp(n = 1): string { return `${CSI}${n}A`; }
export function moveDown(n = 1): string { return `${CSI}${n}B`; }
export function moveRight(n = 1): string { return `${CSI}${n}C`; }
export function moveLeft(n = 1): string { return `${CSI}${n}D`; }

/** Request cursor position report (ESC[6n). Terminal responds with ESC[row;colR. */
export const requestCursorPosition = `${CSI}6n`;

// ── Screen Control ──────────────────────────────────

/** Clear entire screen (CSI 2J). */
export const clearScreen = `${CSI}2J`;
/** Clear entire current line (CSI 2K). */
export const clearLine = `${CSI}2K`;
/** Clear from cursor to end of line (CSI 0K). */
export const clearLineToEnd = `${CSI}0K`;
/** Clear from cursor to start of line (CSI 1K). */
export const clearLineToStart = `${CSI}1K`;
/** Clear from cursor to bottom of screen (CSI J). */
export const clearDown = `${CSI}J`;
/** Clear from cursor to top of screen (CSI 1J). */
export const clearUp = `${CSI}1J`;

// ── Alternate Screen Buffer ─────────────────────────

/** Enter alternate screen buffer (DEC private mode 1049). Restores main buffer on exit. */
export const enterAltScreen = `${CSI}?1049h`;
/** Exit alternate screen buffer, returning to main buffer. */
export const exitAltScreen = `${CSI}?1049l`;

// ── Synchronized Output (CSI 2026) ──────────────────

/** Begin synchronized update — terminal holds display until end marker */
export const beginSyncUpdate = `${CSI}?2026h`;
/** End synchronized update — terminal flushes all pending changes atomically */
export const endSyncUpdate = `${CSI}?2026l`;

// ── Mouse Tracking ──────────────────────────────────

/** Enable SGR mouse tracking (most compatible modern mode) */
export const enableMouse = `${CSI}?1000h${CSI}?1002h${CSI}?1006h`;
/** Disable mouse tracking */
export const disableMouse = `${CSI}?1000l${CSI}?1002l${CSI}?1006l`;

// ── Bracketed Paste ─────────────────────────────────

/** Enable bracketed paste mode (DEC private mode 2004). Wraps pasted text in escape sequences. */
export const enableBracketedPaste = `${CSI}?2004h`;
/** Disable bracketed paste mode. */
export const disableBracketedPaste = `${CSI}?2004l`;

// ── Focus Tracking ──────────────────────────────────

/** Enable focus tracking (DEC private mode 1004). Terminal sends events on focus in/out. */
export const enableFocusTracking = `${CSI}?1004h`;
/** Disable focus tracking. */
export const disableFocusTracking = `${CSI}?1004l`;

// ── Text Styling ────────────────────────────────────

/** Reset all text attributes to default (SGR 0). */
export const reset = `${CSI}0m`;
/** Enable bold/high-intensity text (SGR 1). */
export const bold = `${CSI}1m`;
/** Enable dim/faint text (SGR 2). */
export const dim = `${CSI}2m`;
/** Enable italic text (SGR 3). Not supported by all terminals. */
export const italic = `${CSI}3m`;
/** Enable underlined text (SGR 4). */
export const underline = `${CSI}4m`;
/** Enable blinking text (SGR 5). Most terminals ignore this. */
export const blink = `${CSI}5m`;
/** Enable inverse/reverse video (SGR 7). Swaps foreground and background. */
export const inverse = `${CSI}7m`;
/** Enable strikethrough text (SGR 9). */
export const strikethrough = `${CSI}9m`;

/** Reset bold and dim attributes (SGR 22). */
export const resetBold = `${CSI}22m`;
/** Reset dim attribute (alias for resetBold). */
export const resetDim = resetBold;
/** Reset italic attribute (SGR 23). */
export const resetItalic = `${CSI}23m`;
/** Reset underline attribute (SGR 24). */
export const resetUnderline = `${CSI}24m`;
/** Reset blink attribute (SGR 25). */
export const resetBlink = `${CSI}25m`;
/** Reset inverse attribute (SGR 27). */
export const resetInverse = `${CSI}27m`;
/** Reset strikethrough attribute (SGR 29). */
export const resetStrikethrough = `${CSI}29m`;

// ── Scrolling Region ────────────────────────────────

/**
 * Set the terminal's scroll region (DECSTBM).
 * Lines outside this region will not scroll.
 * @param top - Top line of scroll region (0-indexed).
 * @param bottom - Bottom line of scroll region (0-indexed, inclusive).
 */
export function setScrollRegion(top: number, bottom: number): string {
    return `${CSI}${top + 1};${bottom + 1}r`;
}
/** Reset scroll region to entire screen (CSI r). */
export const resetScrollRegion = `${CSI}r`;

// ── Title ───────────────────────────────────────────

/**
 * Set the terminal window/tab title via OSC 0.
 * Input is sanitized to prevent terminal escape injection.
 * @param title - The title string to display.
 */
export function setTitle(title: string): string {
    const safeTitle = title.replace(/[\u0000-\u001F\u007F-\u009F\u001B]/g, '');
    return `${OSC}0;${safeTitle}\x07`;
}

// ── Hyperlinks (OSC 8) ──────────────────────────────

/** OSC 8 open: ESC ] 8 ; ; <url> ST. */
export function hyperlinkOpen(url: string): string {
    // Block non-http/https/file schemes (e.g. javascript:, data:).
    if (!/^(https?|file):\/\//i.test(url)) return '';
    // Strip C0/C1 controls and ESC to prevent terminal escape injection.
    const safeUrl = url.replace(/[\u0000-\u001F\u007F-\u009F\u001B]/g, '');
    return `\x1b]8;;${safeUrl}\x1b\\`;
}

/** OSC 8 close: ESC ] 8 ; ; ST. */
export const hyperlinkClose: string = '\x1b]8;;\x1b\\';

/** The BEL control byte. */
export const bell = '\x07';

/** OSC 9 desktop notification: ESC ] 9 ; <text> BEL. */
export function notify(text: string): string {
    // Strip C0/C1 controls and ESC to prevent terminal escape injection.
    const safeText = text.replace(/[\u0000-\u001F\u007F-\u009F\u001B]/g, '');
    return `${OSC}9;${safeText}${bell}`;
}

// ── Security: ANSI/control stripping ────────────────

/**
 * Strip ANSI escape sequences and dangerous C0/C1 control characters from a
 * string, while keeping printable Unicode intact.
 *
 * Removes:
 *  - All ESC-introduced sequences (CSI, OSC, DCS, PM, APC, SS2/SS3, etc.)
 *  - Bare C0 controls (0x00-0x1F) except TAB (0x09) and LF (0x0A)
 *  - C1 controls / DEL (0x7F-0x9F)
 *
 * Safe for use on user-supplied or file-read strings before they are rendered
 * to the terminal.
 */
export function stripAnsiControl(str: string): string {
    // Remove all ESC-introduced sequences (CSI, OSC, DCS, SS2/SS3, etc.)
    // eslint-disable-next-line no-control-regex
    let out = str.replace(
        /\x1b(?:[@-Z\\-_]|\[[0-9;<=>?]*[a-zA-Z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[PX^_][^\x1b]*\x1b\\|.)/g,
        ''
    );
    // Remove remaining bare C0 controls (keep TAB=0x09, LF=0x0A) and C1/DEL
    // eslint-disable-next-line no-control-regex
    out = out.replace(/[\x00-\x08\x0B-\x1F\x7F-\x9F]/g, '');
    return out;
}

// ── Clipboard ───────────────────────────────────────

/**
 * Write text to the system clipboard via OSC 52.
 * Supported by: xterm, iTerm2, Kitty, WezTerm, Alacritty, Windows Terminal.
 * @param text Plain text to copy to clipboard
 * @param stdout Target stream (default: process.stdout)
 */
export function writeClipboard(text: string, stdout: NodeJS.WriteStream = process.stdout): void {
    const encoded = Buffer.from(text, 'utf8').toString('base64');
    stdout.write(`${OSC}52;c;${encoded}\x07`);
}
/**
 * Read text from the system clipboard via OSC 52.
 * Sends a clipboard read request and waits for the terminal's response.
 * @param stdin - Input stream to listen for the response (default: process.stdin).
 * @param stdout - Output stream to send the request (default: process.stdout).
 * @param timeoutMs - Maximum wait time in ms before rejecting (default: 1000).
 * @returns The clipboard contents as a UTF-8 string.
 * @throws {Error} If the terminal does not respond within timeoutMs.
 */
export function readClipboard(
    stdin: NodeJS.ReadStream = process.stdin,
    stdout: NodeJS.WriteStream = process.stdout,
    timeoutMs = 1000,
): Promise<string> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const handler = (data: Buffer) => {
            const str = data.toString('utf8');
            const match = str.match(/\x1b\]52;c;([^\x07]+)\x07/);

            if (!match) return;
            
            cleanup();

            try {
                resolve(
                    Buffer.from(match[1], 'base64').toString('utf8')
                );
            } catch (err) {
                reject(err);
            }
        };

        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('Clipboard read timed out'));
        }, timeoutMs);

        const cleanup = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            stdin.off('data', handler);
        };

        stdin.on('data', handler);

        stdout.write(`${OSC}52;c;?\x07`);
    });
}

