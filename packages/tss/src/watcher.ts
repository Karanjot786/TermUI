// ─────────────────────────────────────────────────────
// TSS Watcher — hot-reloads .tss files on change
// ─────────────────────────────────────────────────────

import { watch, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { ThemeEngine } from './engine.js';

export interface WatcherOptions {
    /** Directory (or directories) to watch for .tss files */
    dir?: string;
    /** Multiple directories to watch — takes precedence over `dir` */
    watchDirs?: string[];
    /** Theme engine to update */
    engine: ThemeEngine;
    /** Callback after successful reload (single listener shorthand) */
    onReload?: (filename: string) => void;
    /** Callback on error (single listener shorthand) */
    onError?: (err: Error) => void;
    /** Debounce window in milliseconds (default: 50) */
    debounceMs?: number;
    /** Attached child process for IPC forwarding (optional) */
    childProcess?: ChildProcess;
}

export class TSSWatcher {
    private _abortControllers: AbortController[] = [];
    private _dirs: string[];
    private _engine: ThemeEngine;
    private _changeListeners: Set<(filename: string) => void> = new Set();
    private _errorListeners: Set<(err: Error) => void> = new Set();
    private _debounceMs: number;
    private _debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private _childProcess?: ChildProcess;

    constructor(options: WatcherOptions) {
        // Resolve directories: watchDirs takes precedence over dir
        const rawDirs = options.watchDirs ?? (options.dir ? [options.dir] : []);
        this._dirs = rawDirs.map((d) => resolve(d));
        this._engine = options.engine;
        this._debounceMs = options.debounceMs ?? 50;
        this._childProcess = options.childProcess;

        // Single-listener constructor shorthands remain fully supported
        if (options.onReload) this._changeListeners.add(options.onReload);
        if (options.onError) this._errorListeners.add(options.onError);
    }

    // ── Public listener-registration API ──────────────────────

    /** Register a change listener; returns an unsubscribe function. */
    onChange(fn: (filename: string) => void): () => void {
        this._changeListeners.add(fn);
        return () => this._changeListeners.delete(fn);
    }

    /** Register an error listener; returns an unsubscribe function. */
    onError(fn: (err: Error) => void): () => void {
        this._errorListeners.add(fn);
        return () => this._errorListeners.delete(fn);
    }

    // ── Lifecycle ──────────────────────────────────────────────

    /** Start watching for .tss file changes */
    start(): void {
        // Guard: already started
        if (this._abortControllers.length > 0) return;

        for (const dir of this._dirs) {
            if (!existsSync(dir)) continue;

            const ac = new AbortController();
            this._abortControllers.push(ac);

            try {
                const watcher = watch(dir, {
                    recursive: true,
                    signal: ac.signal,
                });

                watcher.on('change', (_event, filename) => {
                    if (!filename || typeof filename !== 'string') return;
                    if (extname(filename) !== '.tss') return;
                    this._scheduleReload(filename);
                });

                watcher.on('error', (err) => {
                    if ((err as NodeJS.ErrnoException).name === 'AbortError') return;
                    this._emitError(err);
                });
            } catch (err) {
                this._emitError(err as Error);
            }
        }
    }

    /** Stop watching and cancel all pending debounced reloads */
    stop(): void {
        // Cancel all pending debounce timers first so their callbacks never fire
        for (const timer of this._debounceTimers.values()) {
            clearTimeout(timer);
        }
        this._debounceTimers.clear();

        // Abort all fs.watch instances
        for (const ac of this._abortControllers) {
            ac.abort();
        }
        this._abortControllers = [];
    }

    /** Load all .tss files in the watched directories */
    loadAll(): void {
        const tssSources: string[] = [];
        for (const dir of this._dirs) {
            if (!existsSync(dir)) continue;
            const files = readdirSync(dir, { recursive: true }) as string[];
            for (const file of files) {
                if (extname(file.toString()) === '.tss') {
                    const fullPath = resolve(dir, file.toString());
                    tssSources.push(readFileSync(fullPath, 'utf-8'));
                }
            }
        }
        if (tssSources.length > 0) {
            this._engine.loadAll(tssSources);
        }
    }

    // ── Internal ───────────────────────────────────────────────

    private _scheduleReload(filename: string): void {
        // Clear any existing timer for this filename
        const existing = this._debounceTimers.get(filename);
        if (existing !== undefined) clearTimeout(existing);

        const timer = setTimeout(() => {
            this._debounceTimers.delete(filename);
            this._reload(filename);
        }, this._debounceMs);

        this._debounceTimers.set(filename, timer);
    }

    private _reload(filename: string): void {
        try {
            this.loadAll();
            this._emitChange(filename);
            this._sendIpc(filename);
        } catch (err) {
            this._emitError(err as Error);
        }
    }

    private _emitChange(filename: string): void {
        for (const fn of this._changeListeners) fn(filename);
    }

    private _emitError(err: Error): void {
        for (const fn of this._errorListeners) fn(err);
    }

    private _sendIpc(filename: string): void {
        const cp = this._childProcess;
        if (!cp) return;
        // Safety: skip dead or exited child processes
        if (cp.killed || cp.exitCode !== null) return;
        if (typeof cp.send !== 'function') return;
        cp.send({ type: 'tss:reload', filename });
    }
}
