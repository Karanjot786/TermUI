// ─────────────────────────────────────────────────────
// File Watcher — watches .tsx and .tss files
// ─────────────────────────────────────────────────────

import { watch, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';

/**
 * A single detected file change emitted by the {@link FileWatcher}.
 */
export interface FileChange {
    /** Path/name of the changed file. */
    filename: string;
    /** Category of the changed file. */
    type: 'tsx' | 'tss' | 'config';
    /** Epoch milliseconds when the change was detected. */
    timestamp: number;
}

/**
 * Callback registries for {@link FileWatcher} events.
 */
export interface WatcherEvents {
    /** Invoked (debounced) when a relevant file changes. */
    change: (change: FileChange) => void;
    /** Invoked when watching fails for a directory. */
    error: (err: Error) => void;
}

/**
 * Recursively watches one or more directories for `.tsx`/`.tss`/config changes
 * and emits debounced {@link FileChange} events.
 */
export class FileWatcher {
    private _abortControllers: AbortController[] = [];
    private _dirs: string[];
    private _onChangeCallbacks: Array<(change: FileChange) => void> = [];
    private _onErrorCallbacks: Array<(err: Error) => void> = [];
    private _debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    constructor(dirs: string[]) {
        this._dirs = dirs.map(d => resolve(d));
    }

    /** Register a callback invoked when a watched file changes. */
    onChange(fn: (change: FileChange) => void): void { this._onChangeCallbacks.push(fn); }
    /** Register a callback invoked when a watch error occurs. */
    onError(fn: (err: Error) => void): void { this._onErrorCallbacks.push(fn); }

    /** Begin watching all configured directories, debouncing rapid changes. */
    start(): void {
        for (const dir of this._dirs) {
            if (!existsSync(dir)) continue;
            const ac = new AbortController();
            this._abortControllers.push(ac);

            try {
                this.watchDir(dir, dir, ac, true);
            } catch (err) {
                try {
                    this.watchDirectoryTree(dir, ac);
                } catch (fallbackErr) {
                    for (const cb of this._onErrorCallbacks) cb(fallbackErr as Error);
                }
            }
        }
    }

    private watchDirectoryTree(rootDir: string, ac: AbortController): void {
        this.watchDir(rootDir, rootDir, ac, false);

        for (const entry of readdirSync(rootDir)) {
            const child = join(rootDir, entry);
            if (statSync(child).isDirectory()) {
                this.watchDirectoryTree(child, ac);
            }
        }
    }

    private watchDir(rootDir: string, dir: string, ac: AbortController, recursive: boolean): void {
        const watcher = watch(dir, { recursive, signal: ac.signal });

        watcher.on('change', (_event, filename) => {
            this.emitChange(rootDir, dir, filename);
        });

        watcher.on('error', (err) => {
            if ((err as any).name === 'AbortError') return;
            for (const cb of this._onErrorCallbacks) cb(err);
        });
    }

    private emitChange(rootDir: string, dir: string, filename: string | Buffer | null): void {
        if (!filename || typeof filename !== 'string') return;
        const ext = extname(filename);
        let type: FileChange['type'] | null = null;
        if (filename.includes('termui.config')) type = 'config';
        else if (ext === '.tsx' || ext === '.ts' || ext === '.jsx' || ext === '.js') type = 'tsx';
        else if (ext === '.tss') type = 'tss';
        if (!type) return;

        const resolved = resolve(dir, filename);
        const existing = this._debounceTimers.get(resolved);
        if (existing) clearTimeout(existing);
        this._debounceTimers.set(resolved, setTimeout(() => {
            this._debounceTimers.delete(resolved);
            const emittedFilename = dir === rootDir ? filename : resolve(dir, filename).slice(rootDir.length + 1);
            const change: FileChange = { filename: emittedFilename, type: type!, timestamp: Date.now() };
            for (const cb of this._onChangeCallbacks) cb(change);
        }, 100));
    }

    /** Stop all watchers and clear pending debounce timers. */
    stop(): void {
        for (const ac of this._abortControllers) ac.abort();
        this._abortControllers = [];
        for (const timer of this._debounceTimers.values()) clearTimeout(timer);
        this._debounceTimers.clear();
    }
}
