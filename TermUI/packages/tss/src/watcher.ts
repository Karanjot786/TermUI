// ─────────────────────────────────────────────────────
// TSS Watcher — hot-reloads .tss files on change
// ─────────────────────────────────────────────────────

import { watch, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { ThemeEngine } from './engine.js';

export interface WatcherOptions {
    /** Directory to watch for .tss files */
    dir: string;
    /** Theme engine to update */
    engine: ThemeEngine;
    /** Callback after successful reload */
    onReload?: (filename: string) => void;
    /** Callback on error */
    onError?: (err: Error) => void;
}

export class TSSWatcher {
    private _abortController: AbortController | null = null;
    private _dir: string;
    private _engine: ThemeEngine;
    private _onReload?: (filename: string) => void;
    private _onError?: (err: Error) => void;

    constructor(options: WatcherOptions) {
        this._dir = resolve(options.dir);
        this._engine = options.engine;
        this._onReload = options.onReload;
        this._onError = options.onError;
    }

    /** Start watching for .tss file changes */
    start(): void {
        if (this._abortController) return;
        if (!existsSync(this._dir)) return;

        this._abortController = new AbortController();

        try {
            const watcher = watch(this._dir, {
                recursive: true,
                signal: this._abortController.signal,
            });

            watcher.on('change', (_event, filename) => {
                if (!filename || typeof filename !== 'string') return;
                if (extname(filename) !== '.tss') return;
                this._reload(filename);
            });

            watcher.on('error', (err) => {
                if ((err as any).name === 'AbortError') return;
                this._onError?.(err);
            });
        } catch (err) {
            this._onError?.(err as Error);
        }
    }

    /** Stop watching */
    stop(): void {
        this._abortController?.abort();
        this._abortController = null;
    }

    /** Load all .tss files in the watched directory */
    loadAll(): void {
        if (!existsSync(this._dir)) return;
        const files = readdirSync(this._dir, { recursive: true }) as string[];
        const tssSources: string[] = [];
        for (const file of files) {
            if (extname(file.toString()) === '.tss') {
                const fullPath = resolve(this._dir, file.toString());
                tssSources.push(readFileSync(fullPath, 'utf-8'));
            }
        }
        if (tssSources.length > 0) {
            this._engine.loadAll(tssSources);
        }
    }

    private _reload(filename: string): void {
        try {
            // Re-merge all .tss files instead of replacing with just the changed one
            this.loadAll();
            this._onReload?.(filename);
        } catch (err) {
            this._onError?.(err as Error);
        }
    }
}
