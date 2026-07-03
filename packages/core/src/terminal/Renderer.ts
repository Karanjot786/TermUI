// ─────────────────────────────────────────────────────
// @termuijs/core — Differential Renderer
// ─────────────────────────────────────────────────────

import type { Terminal } from './Terminal.js';
import { type Cell, cellsEqual, type Screen } from './Screen.js';
import { type ColorDepth, colorToAnsiFg, colorToAnsiBg } from '../style/Color.js';
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
                    this._lastStyleFingerprint = null;
                    output += this._renderDiffLine(r, front, back, cols);
                }

                output += ansiReset;
                output += endSyncUpdate;

                // Write buffered logs wrapped in cursor save/restore so they
                // don't shift the frame's expected cursor position
                if (bufferedLogs) {
                    this._terminal.writeSync(Renderer._CURSOR_SAVE + bufferedLogs + Renderer._CURSOR_RESTORE);
                }
                this._terminal.writeSync(output);

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

            if (bufferedLogs) {
                this._terminal.writeSync(Renderer._CURSOR_SAVE + bufferedLogs + Renderer._CURSOR_RESTORE);
            }
            this._terminal.writeSync(output);

            // Flush any post-frame raw ANSI sequences (e.g. VTE a11y OSC)
            const ansiQueue = this._screen.drainAnsiQueue();
            if (ansiQueue) this._terminal.writeSync(ansiQueue);

            this._emitStats(start, bufferedLogs, output);
            this._screen.saveLines();
            this._screen.swap();
        } catch (_err) {
            // Re-request render so the next frame tick retries.
            this._renderRequested = true;
            // Reset style fingerprint to prevent color bleed on retry.
            this._lastStyleFingerprint = null;
        }
    }

    /** Style fingerprint of the last rendered cell (to suppress redundant ANSI reset/apply). */
    private _lastStyleFingerprint: string | null = null;

    /** Build a stable style fingerprint string for a cell (avoids allocation-heavy object comparison). */
    private _styleFingerprint(cell: Cell): string {
        const fg = cell.fg;
        const bg = cell.bg;
        let fgKey: string;
        switch (fg.type) {
            case 'none': fgKey = 'n'; break;
            case 'named': fgKey = `N:${fg.name}`; break;
            case 'ansi256': fgKey = `A:${fg.code}`; break;
            case 'rgb': fgKey = `R:${fg.r},${fg.g},${fg.b}`; break;
            case 'hex': fgKey = `H:${fg.hex.toLowerCase()}`; break;
            default: fgKey = 'n';
        }
        let bgKey: string;
        switch (bg.type) {
            case 'none': bgKey = 'n'; break;
            case 'named': bgKey = `N:${bg.name}`; break;
            case 'ansi256': bgKey = `A:${bg.code}`; break;
            case 'rgb': bgKey = `R:${bg.r},${bg.g},${bg.b}`; break;
            case 'hex': bgKey = `H:${bg.hex.toLowerCase()}`; break;
            default: bgKey = 'n';
        }
        return `${cell.bold ? 'B' : ''}${cell.dim ? 'D' : ''}${cell.italic ? 'I' : ''}${cell.underline ? 'U' : ''}${cell.strikethrough ? 'S' : ''}${cell.inverse ? 'V' : ''}|${fgKey}|${bgKey}`;
    }

    /**
     * Generate the ANSI escape sequence to render a single cell.
     * Skips ansiReset + re-apply when the adjacent cell has identical style.
     */
    private _renderCell(cell: Cell): string {
        let seq = '';
        const fp = this._styleFingerprint(cell);

        if (fp !== this._lastStyleFingerprint) {
            seq += ansiReset;
            if (cell.bold) seq += '\x1b[1m';
            if (cell.dim) seq += '\x1b[2m';
            if (cell.italic) seq += '\x1b[3m';
            if (cell.underline) seq += '\x1b[4m';
            if (cell.strikethrough) seq += '\x1b[9m';
            if (cell.inverse) seq += '\x1b[7m';
            seq += colorToAnsiFg(cell.fg, this._colorDepth);
            seq += colorToAnsiBg(cell.bg, this._colorDepth);
            this._lastStyleFingerprint = fp;
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
            // Skip continuation cells (right half of wide chars) - they are not
            // independently renderable and their primary cell handles the output.
            if (back[row][c].width === 0) continue;
            
            const changed = !cellsEqual(front[row][c], back[row][c]);
            if (changed && spanStart === -1) {
                spanStart = c; // start a new changed span
            } else if (!changed && spanStart !== -1) {
                // flush the span
                const adjustedStart = Renderer._adjustSpanStart(spanStart, back[row]);
                output += moveTo(adjustedStart, row);
                for (let sc = spanStart; sc < c; sc++) {
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
            for (let sc = spanStart; sc < cols; sc++) {
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
