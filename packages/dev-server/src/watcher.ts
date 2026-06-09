// ─────────────────────────────────────────────────────
// File Watcher — watches .tsx and .tss files
// ─────────────────────────────────────────────────────

import { watch, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';

export interface FileChange {
    filename: string;
    type: 'tsx' | 'tss' | 'config';
    timestamp: number;
}

export interface WatcherEvents {
    change: (change: FileChange) => void;
    error: (err: Error) => void;
}

export class FileWatcher {
    private _abortControllers: AbortController[] = [];
    private _dirs: string[];
    private _onChangeCallbacks: Array<(change: FileChange) => void> = [];
    private _onErrorCallbacks: Array<(err: Error) => void> = [];
    private _debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    constructor(dirs: string[]) {
        this._dirs = dirs.map(d => resolve(d));
    }

    onChange(fn: (change: FileChange) => void): void { this._onChangeCallbacks.push(fn); }
    onError(fn: (err: Error) => void): void { this._onErrorCallbacks.push(fn); }

    start(): void {
        for (const dir of this._dirs) {
            if (!existsSync(dir)) continue;
            const ac = new AbortController();
            this._abortControllers.push(ac);

            try {
                const watcher = watch(dir, { recursive: true, signal: ac.signal });

                watcher.on('change', (_event, filename) => {
                    if (!filename || typeof filename !== 'string') return;
                    const ext = extname(filename);
                    let type: FileChange['type'] | null = null;
                    if (filename.includes('termui.config')) type = 'config';
                    else if (ext === '.tsx' || ext === '.ts' || ext === '.jsx' || ext === '.js') type = 'tsx';
                    else if (ext === '.tss') type = 'tss';
                    if (!type) return;

                    // Use a per-directory resolved path as the debounce key so files with
                    // the same basename in different watched directories don't collide.
                    const resolved = resolve(dir, filename);

                    // Debounce: coalesce rapid saves for the same resolved file path
                    const existing = this._debounceTimers.get(resolved);
                    if (existing) clearTimeout(existing);
                    this._debounceTimers.set(resolved, setTimeout(() => {
                        this._debounceTimers.delete(resolved);
                        // Preserve the original filename in the emitted FileChange to
                        // avoid changing the public API observed by callers/tests.
                        const change: FileChange = { filename, type: type!, timestamp: Date.now() };
                        for (const cb of this._onChangeCallbacks) cb(change);
                    }, 100));
                });

                watcher.on('error', (err) => {
                    if ((err as any).name === 'AbortError') return;
                    for (const cb of this._onErrorCallbacks) cb(err);
                });
            } catch (err) {
                for (const cb of this._onErrorCallbacks) cb(err as Error);
            }
        }
    }

    stop(): void {
        for (const ac of this._abortControllers) ac.abort();
        this._abortControllers = [];
        for (const timer of this._debounceTimers.values()) clearTimeout(timer);
        this._debounceTimers.clear();
    }
}
