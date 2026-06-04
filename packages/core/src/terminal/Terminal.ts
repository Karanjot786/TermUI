// ─────────────────────────────────────────────────────
// @termuijs/core — Terminal adapter
// ─────────────────────────────────────────────────────

import { ColorDepth, detectColorDepth } from '../style/Color.js';
import * as ansi from '../utils/ansi.js';

export interface TerminalOptions {
    /** Override stdout stream (useful for testing) */
    stdout?: NodeJS.WriteStream;
    /** Override stdin stream (useful for testing) */
    stdin?: NodeJS.ReadStream;
    /** Force a specific color depth */
    colorDepth?: ColorDepth;
    /** Enable mouse tracking */
    mouse?: boolean;
    /** Use alternate screen buffer for full-screen apps */
    altScreen?: boolean;
}

/**
 * Terminal adapter — wraps process.stdout/stdin and manages
 * terminal state (raw mode, cursor, mouse, alternate screen).
 */
export class Terminal {
    readonly stdout: NodeJS.WriteStream;
    readonly stdin: NodeJS.ReadStream;
    readonly colorDepth: ColorDepth;

    private _cols: number;
    private _rows: number;
    private _isRawMode = false;
    private _isAltScreen = false;
    private _isMouseEnabled = false;
    private _resizeHandlers: Array<(cols: number, rows: number) => void> = [];
    private _cleanupHandlers: Array<() => void> = [];
    private _originalRawMode: boolean | undefined;

    // Stored handler references for proper cleanup
    private _resizeHandler: (() => void) | null = null;
    private _exitHandler: (() => void) | null = null;
    private _sigintHandler: (() => void) | null = null;
    private _sigtermHandler: (() => void) | null = null;
    private _uncaughtExceptionHandler: ((err: Error) => void) | null = null;
    private _unhandledRejectionHandler: (() => void) | null = null;
    private _restored = false;

    constructor(options: TerminalOptions = {}) {
        this.stdout = options.stdout ?? process.stdout;
        this.stdin = options.stdin ?? process.stdin;
        this.colorDepth = options.colorDepth ?? detectColorDepth();

        this._cols = this.stdout.columns ?? 80;
        this._rows = this.stdout.rows ?? 24;

        // Listen for terminal resize (store ref for cleanup)
        this._resizeHandler = () => {
            this._cols = this.stdout.columns ?? 80;
            this._rows = this.stdout.rows ?? 24;
            for (const handler of this._resizeHandlers) {
                handler(this._cols, this._rows);
            }
        };
        this.stdout.on('resize', this._resizeHandler);

        // Set up cleanup on process exit
        this._setupCleanup();
    }

    /** Current terminal width in columns */
    get cols(): number { return this._cols; }
    /** Current terminal height in rows */
    get rows(): number { return this._rows; }

    /** Whether stdin is a TTY (interactive) */
    isInteractive(): boolean {
        return Boolean(this.stdin.isTTY) && !process.env['CI'];
    }

    /** Whether the terminal supports raw mode */
    supportsRawMode(): boolean {
        return Boolean(this.stdin.isTTY && typeof this.stdin.setRawMode === 'function');
    }

    // ── Raw Mode ────────────────────────────────────────

    enterRawMode(): void {
        if (this._isRawMode || !this.supportsRawMode()) return;
        this._originalRawMode = this.stdin.isRaw;
        this.stdin.setRawMode(true);
        this.stdin.resume();
        this._isRawMode = true;
    }

    exitRawMode(): void {
        if (!this._isRawMode) return;
        this.stdin.setRawMode(this._originalRawMode ?? false);
        this.stdin.pause();
        this._isRawMode = false;
    }

    // ── Alternate Screen ────────────────────────────────

    enterAltScreen(): void {
        if (this._isAltScreen) return;
        this.write(ansi.enterAltScreen);
        this._isAltScreen = true;
    }

    exitAltScreen(): void {
        if (!this._isAltScreen) return;
        this.write(ansi.exitAltScreen);
        this._isAltScreen = false;
    }

    // ── Mouse ───────────────────────────────────────────

    enableMouse(): void {
        if (this._isMouseEnabled) return;
        this.write(ansi.enableMouse);
        this._isMouseEnabled = true;
    }

    disableMouse(): void {
        if (!this._isMouseEnabled) return;
        this.write(ansi.disableMouse);
        this._isMouseEnabled = false;
    }

    // ── Cursor ──────────────────────────────────────────

    hideCursor(): void { this.write(ansi.hideCursor); }
    showCursor(): void { this.write(ansi.showCursor); }

    /** Ring the terminal bell (BEL). */
    bell(): void { this.write(ansi.bell); }

    /** Send an OSC 9 desktop notification. Body is appended after a separator. */
    notify(title: string, body?: string): void {
        const payload = body === undefined ? title : `${title}: ${body}`;
        this.write(ansi.notify(payload));
    }

    // ── Output ──────────────────────────────────────────

    write(data: string): void {
        this.stdout.write(data);
    }

    // ── Resize ──────────────────────────────────────────

    onResize(handler: (cols: number, rows: number) => void): () => void {
        this._resizeHandlers.push(handler);
        return () => {
            const idx = this._resizeHandlers.indexOf(handler);
            if (idx >= 0) this._resizeHandlers.splice(idx, 1);
        };
    }

    // ── Cleanup ─────────────────────────────────────────

    /**
     * Restore terminal to its original state.
     * Removes all process signal handlers to prevent leaks.
     * Called automatically on SIGINT, SIGTERM, process exit.
     */
    restore(): void {
        if (this._restored) return; // Prevent double-restore
        this._restored = true;

        // Remove process-level signal handlers to prevent leaks
        if (this._exitHandler) process.off('exit', this._exitHandler);
        if (this._sigintHandler) process.off('SIGINT', this._sigintHandler);
        if (this._sigtermHandler) process.off('SIGTERM', this._sigtermHandler);
        if (this._uncaughtExceptionHandler) {
            process.off('uncaughtException', this._uncaughtExceptionHandler);
            this._uncaughtExceptionHandler = null;
        }
        if (this._unhandledRejectionHandler) {
            process.off('unhandledRejection', this._unhandledRejectionHandler);
            this._unhandledRejectionHandler = null;
        }

        // Remove resize listener
        if (this._resizeHandler) {
            this.stdout.off('resize', this._resizeHandler);
        }

        this.disableMouse();
        this.exitAltScreen();
        this.exitRawMode();
        this.showCursor();
        this.write(ansi.reset);
    }

    /**
     * Register a custom cleanup handler that runs on terminal restore.
     */
    onCleanup(handler: () => void): void {
        this._cleanupHandlers.push(handler);
    }

    private _setupCleanup(): void {
        const runCleanupHandlers = () => {
            for (const handler of this._cleanupHandlers) {
                try { handler(); } catch { /* swallow */ }
            }
            this.restore();
        };

        this._exitHandler = runCleanupHandlers;
        this._sigintHandler = () => { runCleanupHandlers(); process.exit(130); };
        this._sigtermHandler = () => { runCleanupHandlers(); process.exit(143); };

        process.on('exit', this._exitHandler);
        process.on('SIGINT', this._sigintHandler);
        process.on('SIGTERM', this._sigtermHandler);

        this._uncaughtExceptionHandler = (err: Error) => {
            this.restore();
            process.exit(1);
        };
        this._unhandledRejectionHandler = () => {
            this.restore();
            process.exit(1);
        };
        // Use .on() (not .once()) so restore() can explicitly remove these handlers
        // via process.off(). With .once(), the reference is removed after first fire,
        // making process.off() in restore() a no-op on subsequent exceptions.
        process.on('uncaughtException', this._uncaughtExceptionHandler);
        process.on('unhandledRejection', this._unhandledRejectionHandler);
    }
}
