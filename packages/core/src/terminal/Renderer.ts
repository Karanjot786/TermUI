// ─────────────────────────────────────────────────────
// @termuijs/core — Differential Renderer
// ─────────────────────────────────────────────────────

import type { Terminal } from './Terminal.js';
import { type Cell, cellsEqual, type Screen } from './Screen.js';
import { type Color, type ColorDepth, colorToAnsiFg, colorToAnsiBg } from '../style/Color.js';
import { moveTo, beginSyncUpdate, endSyncUpdate, reset as ansiReset, stripAnsiControl } from '../utils/ansi.js';
import { RenderHook } from '../renderer/render-hook.js';

/**
 * Render frame statistics.
 */
export interface FrameStats {
    /** Number of cells that differed and were redrawn this frame. */
    cellsChanged: number;
    /** Total bytes written to the terminal this frame. */
    bytesWritten: number;
    /** Wall-clock duration of the flush in milliseconds. */
    durationMs: number;
}

/**
 * Differential renderer — compares front/back screen buffers and
 * outputs only the changed cells. Uses synchronized output (CSI 2026)
 * for atomic, flicker-free updates.
 */
export class Renderer {
    private _terminal: Terminal;
    private _screen: Screen;
    private _fps: number;
    private _frameTimer: ReturnType<typeof setInterval> | null = null;
    private _renderRequested = false;
    private _colorDepth: ColorDepth;
    private _diffRenderer: boolean;
    private _onTick: (() => void) | null = null;
    private _callbacks = new Set<(stats: FrameStats) => void>();
    
    /** The stdout interceptor hook for buffering external logs */
    public readonly hook: RenderHook;

    constructor(terminal: Terminal, screen: Screen, fps = 30, diffRenderer = true) {
        this._terminal = terminal;
        this._screen = screen;
        this._fps = fps;
        this._colorDepth = terminal.colorDepth;
        this._diffRenderer = diffRenderer;
        this.hook = new RenderHook();
    }

    /** Change the rendering frame rate cap */
    setFPS(fps: number): void {
        this._fps = fps;
        if (this._frameTimer) {
            this.stop();
            this.start(this._onTick ?? undefined);
        }
    }

    /** Start the render loop */
    start(onTick?: () => void): void {
        if (this._frameTimer) return;
        this._onTick = onTick ?? null;
        const interval = Math.floor(1000 / this._fps);
        this._frameTimer = setInterval(() => {
            if (this._renderRequested) {
                this._renderRequested = false;
                this._flush();
            }
            this._onTick?.();
        }, interval);
    }

    /** Stop the render loop */
    stop(): void {
        if (this._frameTimer) {
            clearInterval(this._frameTimer);
            this._frameTimer = null;
        }
    }

    /** Request a render on the next frame */
    requestFrame(): void {
        this._renderRequested = true;
    }

    /** Force an immediate render (bypass frame rate) */
    renderNow(): void {
        this._flush();
    }

    /** Register a per-frame profiling callback. Returns an unsubscribe function. */
    onFrame(cb: (stats: FrameStats) => void): () => void {
        this._callbacks.add(cb);
        return () => {
            this._callbacks.delete(cb);
        };
    }

    /**
     * Full-screen clear and redraw (first render or after resize).
     */
    fullRender(): void {
        this._screen.invalidate();
        this._terminal.writeSync('\x1b[2J\x1b[H');
        this._flush();
    }

    /** ANSI sequence to save cursor position */
    private static _CURSOR_SAVE = '\x1b[s';
    /** ANSI sequence to restore cursor position */
    private static _CURSOR_RESTORE = '\x1b[u';

    /**
     * Core diff and flush: compare front vs back buffer,
     * emit only changed cells.
     */
    private _flush(): void {
        // Capture the current epoch; if swap() has already been called by a
        // duplicate callback, skip this flush to prevent buffer corruption.
        const epoch = this._screen.epoch;
        if (this._screen.flushEpoch === epoch) return;
        this._screen.flushEpoch = epoch;

        const start = this._callbacks.size > 0 ? performance.now() : 0;

        // 1. Grab any logs that console.log() caught while we were rendering
        const bufferedLogs = this.hook.flush();
        
        if (bufferedLogs) {
            // Force a full redraw of the UI underneath the new logs so it doesn't get corrupted
            this._screen.invalidate();
        }

        try {
            const { front, back, cols, rows } = this._screen;
            let output = beginSyncUpdate;

            if (this._diffRenderer) {
                for (let r = 0; r < rows; r++) {
                    this._lastStyleState = null;
                    output += this._renderDiffLine(r, front, back, cols);
                }

                output += ansiReset;
                output += endSyncUpdate;

                // Write frame content first (inside synchronized update), then
                // buffered logs with cursor save/restore to prevent flicker
                this._terminal.writeSync(output);
                if (bufferedLogs) {
                    this._terminal.writeSync(Renderer._CURSOR_SAVE + bufferedLogs + Renderer._CURSOR_RESTORE);
                }

                // Flush any post-frame raw ANSI sequences (e.g. VTE a11y OSC)
                const ansiQueue = this._screen.drainAnsiQueue();
                if (ansiQueue) this._terminal.writeSync(ansiQueue);

                this._screen.saveLines();
                this._emitStats(start, bufferedLogs, output);
                this._screen.swap();
                return;
            }

            for (let r = 0; r < rows; r++) {
                if (this._screen.getLine(r) === this._screen.getPreviousLine(r)
                    && this._screen.getStyleLine(r) === this._screen.getPreviousStyleLine(r)) continue;
                output += moveTo(0, r);
                output += this._renderLine(r);
            }

            output += ansiReset;
            output += endSyncUpdate;

            this._terminal.writeSync(output);
            if (bufferedLogs) {
                this._terminal.writeSync(Renderer._CURSOR_SAVE + bufferedLogs + Renderer._CURSOR_RESTORE);
            }

            // Flush any post-frame raw ANSI sequences (e.g. VTE a11y OSC)
            const ansiQueue = this._screen.drainAnsiQueue();
            if (ansiQueue) this._terminal.writeSync(ansiQueue);

            this._emitStats(start, bufferedLogs, output);
            this._screen.saveLines();
            this._screen.swap();
        } catch (_err) {
            if (bufferedLogs) {
                this.hook.requeue(bufferedLogs);
            }
            // Reset flushEpoch so the next render attempt isn't skipped by the epoch guard
            // (a throwing flush must not permanently freeze rendering).
            this._screen.flushEpoch = -1;
            // Re-request render so the next frame tick retries.
            this._renderRequested = true;
            // Reset style state to prevent color bleed on retry.
            this._lastStyleState = null;
        }
    }

    /** The last rendered style state for the current row (to suppress redundant ANSI reset/apply). */
    private _lastStyleState: {
        bold: boolean;
        dim: boolean;
        italic: boolean;
        underline: boolean;
        strikethrough: boolean;
        inverse: boolean;
        fg: Color;
        bg: Color;
    } | null = null;

    private _stylesEqual(cell: Cell): boolean {
        const last = this._lastStyleState;
        if (!last) return false;

        return last.bold === cell.bold &&
            last.dim === cell.dim &&
            last.italic === cell.italic &&
            last.underline === cell.underline &&
            last.strikethrough === cell.strikethrough &&
            last.inverse === cell.inverse &&
            this._colorsEqual(last.fg, cell.fg) &&
            this._colorsEqual(last.bg, cell.bg);
    }

    private _colorsEqual(a: Color, b: Color): boolean {
        if (a.type !== b.type) return false;

        if (a.type === 'none') return true;
        if (a.type === 'named' && b.type === 'named') return a.name === b.name;
        if (a.type === 'ansi256' && b.type === 'ansi256') return a.code === b.code;
        if (a.type === 'rgb' && b.type === 'rgb') return a.r === b.r && a.g === b.g && a.b === b.b;
        if (a.type === 'hex' && b.type === 'hex') return a.hex.toLowerCase() === b.hex.toLowerCase();
        return false;
    }

    /**
     * Generate the ANSI escape sequence to render a single cell.
     * Skips ansiReset + re-apply when the adjacent cell has identical style.
     */
    private _renderCell(cell: Cell): string {
        let seq = '';

        if (!this._stylesEqual(cell)) {
            seq += ansiReset;
            if (cell.bold) seq += '\x1b[1m';
            if (cell.dim) seq += '\x1b[2m';
            if (cell.italic) seq += '\x1b[3m';
            if (cell.underline) seq += '\x1b[4m';
            if (cell.strikethrough) seq += '\x1b[9m';
            if (cell.inverse) seq += '\x1b[7m';
            seq += colorToAnsiFg(cell.fg, this._colorDepth);
            seq += colorToAnsiBg(cell.bg, this._colorDepth);
            this._lastStyleState = {
                bold: cell.bold,
                dim: cell.dim,
                italic: cell.italic,
                underline: cell.underline,
                strikethrough: cell.strikethrough,
                inverse: cell.inverse,
                fg: cell.fg,
                bg: cell.bg,
            };
        }

        // Write the character (sanitized to prevent escape injection)
        seq += stripAnsiControl(cell.char) || ' ';
        return seq;
    }

    /**
     * If a span starts at a width-0 continuation cell (the second half of a
     * wide character), adjust backward to the preceding cell so the cursor
     * is placed at a valid column boundary.
     */
    private static _adjustSpanStart(col: number, row: Cell[]): number {
        while (col > 0 && row[col].width === 0) {
            col--;
        }
        return col;
    }

    /**
     * Render only the changed spans within a single row (cell-level granularity).
     * Uses moveTo to position the cursor at the start of each changed span.
     */
    private _renderDiffLine(row: number, front: Cell[][], back: Cell[][], cols: number): string {
        let output = '';
        let spanStart = -1;

        for (let c = 0; c < cols; c++) {
            const changed = !cellsEqual(front[row][c], back[row][c]);
            // Skip continuation cells (right half of wide chars) if they haven't changed.
            // If they have changed, we must process them so we can adjust the span start back to the primary cell.
            if (back[row][c].width === 0 && !changed) continue;
            if (changed && spanStart === -1) {
                spanStart = c; // start a new changed span
            } else if (!changed && spanStart !== -1) {
                // flush the span
                const adjustedStart = Renderer._adjustSpanStart(spanStart, back[row]);
                output += moveTo(adjustedStart, row);
                for (let sc = adjustedStart; sc < c; sc++) {
                    const cell = back[row][sc];
                    if (cell.width === 0) continue;
                    output += this._renderCell(cell);
                }
                spanStart = -1;
            }
        }

        // flush trailing span
        if (spanStart !== -1) {
            const adjustedStart = Renderer._adjustSpanStart(spanStart, back[row]);
            output += moveTo(adjustedStart, row);
            for (let sc = adjustedStart; sc < cols; sc++) {
                const cell = back[row][sc];
                if (cell.width === 0) continue;
                output += this._renderCell(cell);
            }
        }

        return output;
    }

    private _renderLine(row: number): string {
        let output = '';
        for (let c = 0; c < this._screen.cols; c++) {
            const cell = this._screen.back[row][c];
            if (cell.width === 0) continue;
            output += this._renderCell(cell);
        }
        return output;
    }

    private _emitStats(start: number, bufferedLogs: string | null, output: string): void {
        if (this._callbacks.size === 0) return;

        const durationMs = performance.now() - start;
        const { front, back, cols, rows } = this._screen;
        let cellsChanged = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!cellsEqual(front[r][c], back[r][c])) {
                    cellsChanged++;
                }
            }
        }

        const bytesWritten = (bufferedLogs ? Buffer.byteLength(bufferedLogs) : 0) + Buffer.byteLength(output);

        const stats: FrameStats = {
            cellsChanged,
            bytesWritten,
            durationMs: Math.max(0, durationMs),
        };

        for (const cb of this._callbacks) {
            try {
                cb(stats);
            } catch {
                // Callback errors must not break rendering
            }
        }
    }
}
