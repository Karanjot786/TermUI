import { watch, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';

export interface ThemeChange {
    filename: string;
    timestamp: number;
}

export interface ThemeWatcherOptions {
    /** Directories to watch (relative or absolute) */
    watchDirs?: string[];
}

type ChildLike = { send: (msg: unknown) => void; killed?: boolean; exitCode?: number | null };

export class ThemeWatcher {
    private _abortControllers: AbortController[] = [];
    private _dirs: string[];
    private _onChangeCallbacks: Array<(change: ThemeChange) => void> = [];
    private _onErrorCallbacks: Array<(err: Error) => void> = [];
    private _debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private _child: ChildLike | null = null;

    constructor(options: ThemeWatcherOptions = {}) {
        const dirs = options.watchDirs ?? ['themes'];
        this._dirs = dirs.map(d => resolve(d));
    }

    attachChild(child: ChildLike | null): void { this._child = child; }

    onChange(fn: (change: ThemeChange) => void): void { this._onChangeCallbacks.push(fn); }
    onError(fn: (err: Error) => void): void { this._onErrorCallbacks.push(fn); }

    start(): void {
        for (const dir of this._dirs) {
            if (!existsSync(dir)) continue;
            const ac = new AbortController();
            this._abortControllers.push(ac);

            try {
                const watcher = watch(dir, { recursive: true, signal: ac.signal });

                watcher.on('change', (_event: string, filename: string) => {
                    if (!filename || typeof filename !== 'string') return;
                    const ext = extname(filename);
                    if (ext !== '.tss') return;

                    // Use a per-directory resolved path as the debounce key so files
                    // with the same basename in different watched directories don't collide.
                    const resolved = resolve(dir, filename);

                    // Debounce: coalesce rapid saves for the same resolved file path
                    const existing = this._debounceTimers.get(resolved);
                    if (existing) clearTimeout(existing);
                    this._debounceTimers.set(resolved, setTimeout(() => {
                        this._debounceTimers.delete(resolved);
                        const change: ThemeChange = { filename, timestamp: Date.now() };

                        // Notify listeners
                        for (const cb of this._onChangeCallbacks) cb(change);

                        // If a child is attached, send a lightweight IPC message so
                        // the running app can reload its theme without a full restart.
                        try {
                            if (this._child && typeof this._child.send === 'function' && !this._child.killed && this._child.exitCode === null) {
                                this._child.send({ type: 'theme-reload', filename });
                            }
                        } catch {
                            // ignore
                        }
                    }, 100));
                });

                watcher.on('error', (err: Error) => {
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
