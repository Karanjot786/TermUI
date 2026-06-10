// ─────────────────────────────────────────────────────
// @termuijs/widgets — Pty widget
// ─────────────────────────────────────────────────────

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Screen, Style, KeyEvent } from '@termuijs/core';
import { styleToCellAttrs, stripAnsi, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface PtyOptions {
    /** The command to spawn */
    command?: string;
    /** Arguments to the command */
    args?: string[];
}

/**
 * Pty — Terminal Multiplexer widget.
 * Spawns a child process and renders its output inside the TermUI screen.
 */
export class Pty extends Widget {
    private _process: ChildProcessWithoutNullStreams | null = null;
    private _lines: string[] = [];
    private _autoScroll = true;

    constructor(style: Partial<Style> = {}, opts: PtyOptions = {}) {
        super(style);
        
        // Default to a shell if no command is provided
        const cmd = opts.command ?? (process.platform === 'win32' ? 'cmd.exe' : '/bin/sh');
        const args = opts.args ?? [];
        
        try {
            this._process = spawn(cmd, args);
            
            this._process.stdout.on('data', (data) => {
                this._handleOutput(data.toString());
            });
            
            this._process.stderr.on('data', (data) => {
                this._handleOutput(data.toString());
            });
            
            this._process.on('close', () => {
                this._handleOutput('\n[Process Exited]');
            });
        } catch (err) {
            this._lines.push(`Failed to spawn ${cmd}`);
        }
    }

    private _handleOutput(chunk: string): void {
        const clean = stripAnsi(chunk);
        // Normalize carriage returns and split into lines
        const newLines = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        
        if (newLines.length > 0) {
            if (this._lines.length === 0) {
                this._lines.push(newLines[0]);
            } else {
                this._lines[this._lines.length - 1] += newLines[0];
            }
            
            for (let i = 1; i < newLines.length; i++) {
                this._lines.push(newLines[i]);
            }
        }
        
        // Keep a reasonable buffer size
        if (this._lines.length > 1000) {
            this._lines = this._lines.slice(this._lines.length - 1000);
        }
        
        this.markDirty();
    }

    public handleKey(event: KeyEvent): boolean {
        if (!this._process || !this._process.stdin.writable) return false;
        
        this._process.stdin.write(event.raw);
        return true;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        
        // Render from bottom up or top down depending on scroll
        const startIdx = Math.max(0, this._lines.length - height);
        const visibleLines = this._lines.slice(startIdx, startIdx + height);
        
        for (let i = 0; i < visibleLines.length; i++) {
            // Note: truncate from unicode utils properly handles wide characters
            const line = truncate(visibleLines[i], width);
            screen.writeString(x, y + i, line, attrs);
        }
    }
    
    /**
     * Terminate the spawned process
     */
    public destroy(): void {
        if (this._process) {
            this._process.kill();
            this._process = null;
        }
    }
}
