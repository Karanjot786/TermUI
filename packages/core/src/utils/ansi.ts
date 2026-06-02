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

export function moveTo(col: number, row: number): string {
    return `${CSI}${row + 1};${col + 1}H`;
}

export function moveUp(n = 1): string { return `${CSI}${n}A`; }
export function moveDown(n = 1): string { return `${CSI}${n}B`; }
export function moveRight(n = 1): string { return `${CSI}${n}C`; }
export function moveLeft(n = 1): string { return `${CSI}${n}D`; }

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
export function readClipboard(
    stdin: NodeJS.ReadStream = process.stdin,
    stdout: NodeJS.WriteStream = process.stdout
): Promise<string> {
    return new Promise((resolve, reject) => {
        const handler = (data: Buffer) => {
            const str = data.toString('utf8');

            const match = str.match(/\x1b\]52;c;([^\x07]+)\x07/);

            if (!match) return;

            stdin.off('data', handler);

            try {
                resolve(
                    Buffer.from(match[1], 'base64').toString('utf8')
                );
            } catch (err) {
                reject(err);
            }
        };

        stdin.on('data', handler);

        stdout.write(`${OSC}52;c;?\x07`);
    });
}
