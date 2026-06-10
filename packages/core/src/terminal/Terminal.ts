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
    /** Enable bracketed-paste mode so InputParser receives paste events. */
    bracketedPaste?: boolean;
    /** Debounce window in ms for resize dispatch. Default 16. */
    resizeDebounceMs?: number;
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
    private _isBracketedPasteEnabled = false;
    private _resizeHandlers: Array<(cols: number, rows: number) => void> = [];
    private _cleanupHandlers: Array<() => void> = [];
    private _originalRawMode: boolean | undefined;

    // Debounce state properties
    private _resizeDebounceMs: number;
    private _resizeTimer: ReturnType<typeof setTimeout> | null = null;
    private _lastDispatchedCols: number;
    private _lastDispatchedRows: number;

    // Stored handler references for proper cleanup
    private _resizeHandler: (() => void) | null = null;
    private _exitHandler: (() => void) | null = null;
    private _restored = false;
    private _restoring = false;

    // Stream write queue state to prevent interleaving backpressure fragmentation
    private _writeQueue: string[] = [];
    private _isWriting = false;

    constructor(options: TerminalOptions = {}) {
        this.stdout = options.stdout ?? process.stdout;
        this.stdin = options.stdin ?? process.stdin;
        this.colorDepth = options.colorDepth ?? detectColorDepth();

        this._cols = this.stdout.columns ?? 80;
        this._rows = this.stdout.rows ?? 24;

        this._resizeDebounceMs = options.resizeDebounceMs ?? 16;
        this._lastDispatchedCols = this._cols;
        this._lastDispatchedRows = this._rows;

        // Listen for terminal resize (store ref for cleanup)
        this._resizeHandler = () => {
            // Update immediately so getters are fresh
            this._cols = this.stdout.columns ?? 80;
            this._rows = this.stdout.rows ?? 24;

            // Clear existing debounce timer
            if (this._resizeTimer) {
                clearTimeout(this._resizeTimer);
            }

            // Schedule debounced dispatch
            this._resizeTimer = setTimeout(() => {
                this._resizeTimer = null;

                // Dedup check: skip if dims match the last dispatched dims
                if (this._cols !== this._lastDispatchedCols || this._rows !== this._lastDispatchedRows) {
                    this._lastDispatchedCols = this._cols;
                    this._lastDispatchedRows = this._rows;

                    const handlers = [...this._resizeHandlers];
                    for (const handler of handlers) {
                        handler(this._cols, this._rows);
                    }
                }
            }, this._resizeDebounceMs);
        };
        this.stdout.on('resize', this._resizeHandler);

        // Set up cleanup on process exit
        this._setupCleanup();
        if (options.bracketedPaste) {
            this.enableBracketedPaste();
        }
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

    /** Emit the enable sequence (CSI ?2004h). Idempotent. */
    enableBracketedPaste(): void {
        if (this._isBracketedPasteEnabled) return;
        this.write(ansi.enableBracketedPaste);
        this._isBracketedPasteEnabled = true;
    }

    /** Emit the disable sequence (CSI ?2004l). Idempotent. */
    disableBracketedPaste(): void {
        if (!this._isBracketedPasteEnabled) return;
        this.write(ansi.disableBracketedPaste);
        this._isBracketedPasteEnabled = false;
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

    /**
     * Writes chunked string data to stdout.
     * Enforces queue serialization to ensure atomic ANSI escape execution.
     */
    write(data: string): void {
        if (!data) return;
        
        this._writeQueue.push(data);
        if (this._isWriting) return;

        this._processWriteQueue();
    }

    /**
     * Writes data to stdout synchronously, bypassing the write queue.
     * Used by the renderer during frame flush to avoid races with the
     * async queue lifecycle. Only use for render-path output.
     */
    writeSync(data: string): void {
        if (!data) return;
        this.stdout.write(data);
    }

    /**
     * Sequentially unshifts and drains string frames to stdout safely.
     */
    private _processWriteQueue(): void {
        if (this._writeQueue.length === 0) {
            this._isWriting = false;
            return;
        }

        this._isWriting = true;
        const chunk = this._writeQueue.shift()!;

        // Execute write operation
        const canContinue = this.stdout.write(chunk);

        if (!canContinue) {
            // Buffer saturation hit; halt processing until kernel drains stream cache
            this.stdout.once('drain', () => {
                this._processWriteQueue();
            });
        } else {
            // Proceed instantly via synchronous event-loop cycle
            this._processWriteQueue();
        }
    }

    // ── Clipboard ───────────────────────────────────────

    /**
     * Read text from the system clipboard via OSC 52.
     */
    readClipboard(): Promise<string> {
        return ansi.readClipboard(this.stdin, this.stdout);
    }

    /**
     * Write text to the system clipboard via OSC 52.
     */
    writeClipboard(text: string): void {
        ansi.writeClipboard(text, this.stdout);
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
        if (this._restored || this._restoring) return;
        this._restoring = true;

        if (this._resizeTimer) {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = null;
        }

        // Clear hanging buffer data states
        this._writeQueue = [];
        this._isWriting = false;

        // Remove process-level handlers to prevent leaks
        if (this._exitHandler) process.off('exit', this._exitHandler);

        // Remove resize listener
        if (this._resizeHandler) {
            this.stdout.off('resize', this._resizeHandler);
        }

        // Capture direct stdout.write to bypass any RenderHook hijack
        const directWrite = this.stdout.write.bind(this.stdout);
        const savedWrite = this.write;
        this.write = (s: string) => { directWrite(s); };

        try {
            this.disableBracketedPaste();
            this.disableMouse();
            this.exitAltScreen();
            this.exitRawMode();
            this.showCursor();
            this.write(ansi.reset);
            this._restored = true;
        } finally {
            this.write = savedWrite;
            this._restoring = false;
        }
    }

    /**
     * Register a custom cleanup handler that runs on terminal restore.
     */
    onCleanup(handler: () => void): void {
        this._cleanupHandlers.push(handler);
    }

    private _setupCleanup(): void {
        const runCleanupHandlers = () => {
            const handlers = [...this._cleanupHandlers];
            for (const handler of handlers) {
                try { handler(); } catch { /* swallow */ }
            }
            this.restore();
        };

        this._exitHandler = runCleanupHandlers;

        process.on('exit', this._exitHandler);
    }
}