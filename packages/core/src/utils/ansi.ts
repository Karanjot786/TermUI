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

export const hideCursor = `${CSI}?25l`;
export const showCursor = `${CSI}?25h`;
export const saveCursorPosition = `${CSI}s`;
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

export const requestCursorPosition = `${CSI}6n`;

// ── Screen Control ──────────────────────────────────

export const clearScreen = `${CSI}2J`;
export const clearLine = `${CSI}2K`;
export const clearLineToEnd = `${CSI}0K`;
export const clearLineToStart = `${CSI}1K`;
export const clearDown = `${CSI}J`;
export const clearUp = `${CSI}1J`;

// ── Alternate Screen Buffer ─────────────────────────

export const enterAltScreen = `${CSI}?1049h`;
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

export const enableBracketedPaste = `${CSI}?2004h`;
export const disableBracketedPaste = `${CSI}?2004l`;

// ── Focus Tracking ──────────────────────────────────

export const enableFocusTracking = `${CSI}?1004h`;
export const disableFocusTracking = `${CSI}?1004l`;

// ── Text Styling ────────────────────────────────────

export const reset = `${CSI}0m`;
export const bold = `${CSI}1m`;
export const dim = `${CSI}2m`;
export const italic = `${CSI}3m`;
export const underline = `${CSI}4m`;
export const blink = `${CSI}5m`;
export const inverse = `${CSI}7m`;
export const strikethrough = `${CSI}9m`;

export const resetBold = `${CSI}22m`;
export const resetDim = `${CSI}22m`;
export const resetItalic = `${CSI}23m`;
export const resetUnderline = `${CSI}24m`;
export const resetBlink = `${CSI}25m`;
export const resetInverse = `${CSI}27m`;
export const resetStrikethrough = `${CSI}29m`;

// ── Scrolling Region ────────────────────────────────

export function setScrollRegion(top: number, bottom: number): string {
    return `${CSI}${top + 1};${bottom + 1}r`;
}
export const resetScrollRegion = `${CSI}r`;

// ── Title ───────────────────────────────────────────

export function setTitle(title: string): string {
    return `${OSC}0;${title}\x07`;
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

// ── Clipboard ──────────────────────────────────────────

const TMUX_DCS_START = '\x1bPtmux;';
const TMUX_DCS_END = '\x1b\\';
const SCREEN_DCS_START = '\x1bP';
const SCREEN_DCS_END = '\x1b\\';

/**
 * Wraps an OSC escape sequence for passthrough through tmux or GNU screen.
 * Without this, multiplexers intercept and drop OSC 52 sequences instead
 * of forwarding them to the underlying terminal.
 */
function wrapForMultiplexer(sequence: string): string {
    if (process.env.TMUX) {
        // tmux requires ESC bytes inside the payload to be doubled
        const escaped = sequence.replace(/\x1b/g, '\x1b\x1b');
        return `${TMUX_DCS_START}${escaped}${TMUX_DCS_END}`;
    }
    if (process.env.STY) {
        // GNU screen: wrap in a Device Control String
        return `${SCREEN_DCS_START}${sequence}${SCREEN_DCS_END}`;
    }
    return sequence;
}

/**
 * Write text to the system clipboard via OSC 52.
 * Supported by: xterm, iTerm2, Kitty, WezTerm, Alacritty, Windows Terminal.
 * Automatically wraps the sequence for tmux/screen passthrough when detected.
 * @param text Plain text to copy to clipboard
 * @param stdout Target stream (default: process.stdout)
 */
export function writeClipboard(text: string, stdout: NodeJS.WriteStream = process.stdout): void {
    const encoded = Buffer.from(text, 'utf8').toString('base64');
    const sequence = `${OSC}52;c;${encoded}\x07`;
    stdout.write(wrapForMultiplexer(sequence));
}

export interface ReadClipboardOptions {
    /** Milliseconds to wait for a terminal response before rejecting (default: 1000) */
    timeoutMs?: number;
}

/**
 * Read text from the system clipboard via OSC 52 query.
 * Rejects if the terminal doesn't respond within `timeoutMs` (e.g. the
 * terminal doesn't support OSC 52 queries), preventing an indefinite hang.
 */
export function readClipboard(
    stdin: NodeJS.ReadStream = process.stdin,
    stdout: NodeJS.WriteStream = process.stdout,
    options: ReadClipboardOptions = {}
): Promise<string> {
    const timeoutMs = options.timeoutMs ?? 1000;

    return new Promise((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
            stdin.off('data', handler);
            clearTimeout(timer);
        };

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error('readClipboard timed out: terminal did not respond to OSC 52 query'));
        }, timeoutMs);

        const handler = (data: Buffer) => {
            const str = data.toString('utf8');
            const match = str.match(/\x1b\]52;c;([^\x07]+)\x07/);
            if (!match) return;
            if (settled) return;
            settled = true;
            cleanup();
            try {
                resolve(Buffer.from(match[1], 'base64').toString('utf8'));
            } catch (err) {
                reject(err);
            }
        };

        stdin.on('data', handler);
        stdout.write(wrapForMultiplexer(`${OSC}52;c;?\x07`));
    });
}

export const clipboard = {
    write: writeClipboard,
    read: readClipboard,
};