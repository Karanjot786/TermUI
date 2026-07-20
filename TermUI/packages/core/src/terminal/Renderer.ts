// ─────────────────────────────────────────────────────
// @termuijs/core — Differential Renderer
// ─────────────────────────────────────────────────────

import type { Terminal } from './Terminal.js';
import { type Cell, cellsEqual, type Screen } from './Screen.js';
import { type ColorDepth, colorToAnsiFg, colorToAnsiBg } from '../style/Color.js';
import { moveTo, beginSyncUpdate, endSyncUpdate, reset as ansiReset } from '../utils/ansi.js';
import { RenderHook } from '../renderer/render-hook.js';

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
            this._onTick?.();
            if (this._renderRequested) {
                this._renderRequested = false;
                this._flush();
            }
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

    /**
     * Full-screen clear and redraw (first render or after resize).
     */
    fullRender(): void {
        this._screen.invalidate();
        this._flush();
    }

    /**
     * Core diff and flush: compare front vs back buffer,
     * emit only changed cells.
     */
    private _flush(): void {
        // 1. Grab any logs that console.log() caught while we were rendering
        const bufferedLogs = this.hook.flush();
        
        if (bufferedLogs) {
            // Force a full redraw of the UI underneath the new logs so it doesn't get corrupted
            this._screen.invalidate();
        }

        const { front, back, cols, rows } = this._screen;
        let output = beginSyncUpdate;
        let lastRow = -1;
        let lastCol = -1;

        if (this._diffRenderer) {
            for (let r = 0; r < rows; r++) {
                if (this._screen.getLine(r) === this._screen.getPreviousLine(r)) continue;
                output += moveTo(0, r);
                output += this._renderLine(r);
            }

            output += ansiReset;
            output += endSyncUpdate;

            const isHookActive = this.hook.isActive;
            if (isHookActive) this.hook.stop();
            if (bufferedLogs) this._terminal.write(bufferedLogs);
            this._terminal.write(output);
            if (isHookActive) this.hook.start();

            this._screen.saveLines();
            this._screen.swap();
            return;
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const frontCell = front[r][c];
                const backCell = back[r][c];

                if (cellsEqual(frontCell, backCell)) continue;

                // Skip continuation cells (second half of wide chars)
                if (backCell.width === 0) continue;

                // Move cursor only if not already at the right position
                if (r !== lastRow || c !== lastCol) {
                    output += moveTo(c, r);
                }

                output += this._renderCell(backCell);
                lastRow = r;
                lastCol = c + (backCell.width === 2 ? 2 : 1);
            }
        }

        output += ansiReset;
        output += endSyncUpdate;

        // 2. Pause the hook temporarily so our own UI rendering doesn't get buffered
        const isHookActive = this.hook.isActive;
        if (isHookActive) {
            this.hook.stop();
        }

        // 3. Print the captured logs FIRST (above the UI)
        if (bufferedLogs) {
            this._terminal.write(bufferedLogs);
        }

        // 4. Print the actual UI diff natively
        this._terminal.write(output);

        // 5. Resume catching external logs
        if (isHookActive) {
            this.hook.start();
        }

        this._screen.swap();
    }

    /**
     * Generate the ANSI escape sequence to render a single cell.
     */
    private _renderCell(cell: Cell): string {
        let seq = '';

        // Reset before applying new attributes
        seq += ansiReset;

        // Apply text decorations
        if (cell.bold) seq += '\x1b[1m';
        if (cell.dim) seq += '\x1b[2m';
        if (cell.italic) seq += '\x1b[3m';
        if (cell.underline) seq += '\x1b[4m';
        if (cell.strikethrough) seq += '\x1b[9m';
        if (cell.inverse) seq += '\x1b[7m';

        // Apply colors
        seq += colorToAnsiFg(cell.fg, this._colorDepth);
        seq += colorToAnsiBg(cell.bg, this._colorDepth);

        // Write the character
        seq += cell.char || ' ';

        return seq;
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
}
