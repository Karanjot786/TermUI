// ─────────────────────────────────────────────────────
// Dev Server — orchestrates hot-reload + DevTools
//
// Spawns the user's entry file as a Bun child process.
// When a file change is detected, the child is killed
// and respawned, giving the effect of "hot reload".
// Bun runs .ts/.tsx natively, no loader flag required.
// ─────────────────────────────────────────────────────

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { Subprocess } from 'bun';
import { App } from '@termuijs/core';
import { FileWatcher, type FileChange } from './watcher.js';
import { DevTools } from './devtools.js';
import { ErrorOverlay } from './error-overlay.js';

export interface DevServerOptions {
    /** Project root directory */
    rootDir: string;

    /** Directories to watch (relative to rootDir) */
    watchDirs?: string[];

    /** Entry file (relative to rootDir or absolute) */
    entry?: string;

    /** Callback on reload */
    onReload?: (change: FileChange) => void;

    /** Whether to show DevTools */
    devTools?: boolean;

    /** Extra Bun runtime flags to pass to the child process */
    bunFlags?: string[];

    /** Debounce interval in ms before killing/respawning (default: 200) */
    debounce?: number;

    /** How long the reload banner stays visible, in ms. Default: 1500 */
    bannerMs?: number;
}

type ChildSubprocess = Subprocess<'pipe', 'inherit', 'pipe'>;

export class DevServer {
    private _watcher: FileWatcher;
    private _devtools: DevTools;
    private _rootDir: string;
    private _running = false;
    private _reloadCount = 0;
    private _onReload?: (change: FileChange) => void;

    // ── Child process management ──
    private _child: ChildSubprocess | null = null;
    private _entryFile: string | null = null;
    private _bunFlags: string[];
    private _debounce: number;
    private _reloadTimer: ReturnType<typeof setTimeout> | null = null;

    private _banner: string | null = null;
    private _bannerMs: number;
    private _bannerTimer: ReturnType<typeof setTimeout> | null = null;

    private _errorApp: App | null = null;

    constructor(options: DevServerOptions) {
        this._rootDir = resolve(options.rootDir);
        this._onReload = options.onReload;
        this._bunFlags = options.bunFlags ?? [];
        this._debounce = options.debounce ?? 200;
        this._bannerMs = options.bannerMs ?? 1500;

        // Resolve entry file
        if (options.entry) {
            this._entryFile = resolve(this._rootDir, options.entry);
        } else {
            // Auto-detect common entry points
            for (const candidate of [
                'src/index.tsx',
                'src/index.ts',
                'src/main.tsx',
                'src/main.ts',
                'index.ts'
            ]) {
                const fullPath = resolve(this._rootDir, candidate);

                if (existsSync(fullPath)) {
                    this._entryFile = fullPath;
                    break;
                }
            }
        }

        const watchDirs = (
            options.watchDirs ?? ['src', 'screens', 'themes']
        ).map((d) => resolve(this._rootDir, d));

        this._watcher = new FileWatcher(watchDirs);
        this._devtools = new DevTools();

        this._watcher.onChange((change) => {
            this._reloadCount++;
            this._handleChange(change);
        });

        this._watcher.onError((err) => {
            console.error(`[termui] Watch error: ${err.message}`);
        });
    }

    get devtools(): DevTools {
        return this._devtools;
    }

    get reloadCount(): number {
        return this._reloadCount;
    }

    get isRunning(): boolean {
        return this._running;
    }

    get childProcess(): ChildSubprocess | null {
        return this._child;
    }

    get banner(): string | null {
        return this._banner;
    }

    /** Start the dev server — spawns the entry file and begins watching */
    start(): void {
        if (this._running) return;

        this._running = true;

        console.log();
        console.log('  ⚡ TermUI Dev Server (Bun)');
        console.log(`  📁 ${this._rootDir}`);

        if (this._entryFile) {
            console.log(`  🚀 Entry: ${this._entryFile}`);
        }

        console.log('  👀 Watching for changes...');
        console.log('  F12 toggles DevTools');
        console.log();

        this._watcher.start();

        // Spawn the initial child process
        if (this._entryFile) {
            this._spawnChild();
        }
    }

    /** Stop the dev server — kills child process and stops watching */
    stop(): void {
        this._running = false;

        this._hideErrorOverlay();
        this._killChild();
        this._watcher.stop();

        if (this._reloadTimer) {
            clearTimeout(this._reloadTimer);
            this._reloadTimer = null;
        }

        if (this._bannerTimer) {
            clearTimeout(this._bannerTimer);
            this._bannerTimer = null;
        }

        this._banner = null;

        console.log('\n  Dev server stopped.\n');
    }

    // ── Child process lifecycle ──

    /**
     * Spawn the entry file as a Bun subprocess with IPC enabled.
     * Bun runs .ts/.tsx natively, no `--loader` flag required.
     */
    private _spawnChild(): void {
        if (!this._entryFile) return;

        // Ensure any active error overlay is cleaned up before spawning the new child process
        this._hideErrorOverlay();

        try {
            const child = Bun.spawn({
                cmd: ['bun', ...this._bunFlags, this._entryFile],
                cwd: this._rootDir,
                stdin: 'pipe',
                stdout: 'inherit',
                stderr: 'pipe',
                ipc: (msg: unknown) => {
                    const m = msg as {
                        type?: string;
                        event?: string;
                        data?: unknown;
                    };

                    if (m?.type === 'devtools' && m.event) {
                        const detail =
                            typeof m.data === 'string'
                                ? m.data
                                : JSON.stringify(m.data ?? '');

                        this._devtools.logEvent(m.event, detail);
                    }
                },
                serialization: 'json',
                env: {
                    ...process.env,
                    TERMUI_DEV: '1',
                    NODE_ENV: 'development'
                }
            }) as ChildSubprocess;

            this._child = child;

            let stderrBuffer = '';

            (async () => {
                try {
                    const reader = child.stderr.getReader();
                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) break;

                        const chunk = decoder.decode(value);

                        stderrBuffer += chunk;
                        process.stderr.write(chunk);
                    }
                } catch {
                    // Ignored
                }
            })();

            child.exited.then((exitCode) => {
                if (this._child !== child) return;

                const signal = child.signalCode;

                if (
                    this._running &&
                    signal !== 'SIGTERM' &&
                    signal !== 'SIGKILL'
                ) {
                    const time = new Date().toLocaleTimeString();

                    console.log(
                        `  ❌ [${time}] Process exited (code: ${exitCode}, signal: ${signal})`
                    );

                    this._devtools.logEvent(
                        'crash',
                        `exit code ${exitCode}`
                    );

                    if (
                        exitCode !== 0 &&
                        stderrBuffer.trim().length > 0
                    ) {
                        this._showErrorOverlay(stderrBuffer);
                    }
                }

                this._child = null;
            });
        } catch (err) {
            console.error(
                `  ❌ Failed to spawn: ${(err as Error).message}`
            );
        }
    }

    /**
     * Gracefully kill the running child process.
     * Sends SIGTERM first. If it doesn't exit within 2 seconds, sends SIGKILL.
     */
    private _killChild(): void {
        if (!this._child) return;

        const child = this._child;

        this._child = null;

        try {
            child.kill('SIGTERM');
        } catch {
            // already dead
        }

        const forceKillTimer = setTimeout(() => {
            try {
                child.kill('SIGKILL');
            } catch {
                // already dead
            }
        }, 2000);

        child.exited
            .then(() => {
                clearTimeout(forceKillTimer);
            })
            .catch(() => {
                clearTimeout(forceKillTimer);
            });
    }

    /**
     * Handle file changes: kill the current child and respawn.
     * Uses a debounce to coalesce rapid successive changes.
     */
    private _handleChange(change: FileChange): void {
        const time = new Date().toLocaleTimeString();

        const icon =
            change.type === 'tss'
                ? '🎨'
                : change.type === 'config'
                  ? '⚙️'
                  : '📝';

        this._hideErrorOverlay();

        console.log(
            `  ${icon} [${time}] ${change.filename} changed — reloading...`
        );

        this._devtools.logEvent(
            'reload',
            `${change.type}: ${change.filename}`
        );

        this._onReload?.(change);

        if (this._reloadTimer) {
            clearTimeout(this._reloadTimer);
        }

        this._reloadTimer = setTimeout(async () => {
            this._reloadTimer = null;

            if (
                this._child &&
                !this._child.killed &&
                this._child.exitCode === null
            ) {
                try {
                    this._child.send({ type: 'reload' });
                } catch {
                    // IPC channel closed
                }

                await new Promise<void>((r) =>
                    setTimeout(r, 200)
                );
            }

            if (!this._running) return;

            this._killChild();

            setTimeout(() => {
                if (this._running && this._entryFile) {
                    this._spawnChild();

                    const respawnTime =
                        new Date().toLocaleTimeString();

                    console.log(
                        `  🔄 [${respawnTime}] Respawned`
                    );

                    this._banner = 'Reloaded';

                    if (this._bannerTimer) {
                        clearTimeout(this._bannerTimer);
                    }

                    this._bannerTimer = setTimeout(() => {
                        this._banner = null;
                        this._bannerTimer = null;
                    }, this._bannerMs);
                }
            }, 100);
        }, this._debounce);
    }

    private _showErrorOverlay(rawStderr: string): void {
        this._hideErrorOverlay();

        const overlay = new ErrorOverlay(rawStderr);

        this._errorApp = new App(overlay, {
            fullscreen: true,
            title: 'TermUI Dev Server - Error',
            fps: 10,
            skipFallback: true
        });

        this._errorApp.mount().catch(() => {});
    }

    private _hideErrorOverlay(): void {
        if (this._errorApp) {
            try {
                this._errorApp.unmount();
            } catch {
                // Ignore
            }

            this._errorApp = null;
        }
    }
}

export { FileWatcher, DevTools };
export type { FileChange };