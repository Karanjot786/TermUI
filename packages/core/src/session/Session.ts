import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { homedir } from 'node:os';

// ─────────────────────────────────────────────────────
// @termuijs/core — Session Management API
// ─────────────────────────────────────────────────────

export interface SessionOptions {
    /** Enable automatic session saving */
    autoSave?: boolean;

    /** Auto-save interval in milliseconds */
    interval?: number;

    /** File path for persisting session data. Defaults to ~/.termui/session.json */
    storagePath?: string;
}

export interface SessionData {
    [key: string]: unknown;
}

export class Session {
    private _data: SessionData = {};
    private _timer?: ReturnType<typeof setInterval>;
    private _storagePath: string;

    constructor(private _options: SessionOptions = {}) {
        this._storagePath = _options.storagePath ?? `${homedir()}/.termui/session.json`;
        this.restore();
        if (this._options.autoSave) {
            this._timer = setInterval(() => {
                this.save();
            }, this._options.interval ?? 5000);
        }
    }

    /**
     * Save current session data to a JSON file on disk.
     */
    save(): void {
        try {
            const dir = dirname(this._storagePath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            writeFileSync(this._storagePath, JSON.stringify(this._data), 'utf-8');
        } catch {
            // Silently ignore persistence failures (e.g. read-only filesystem)
        }
    }

    /**
     * Restore previous session from disk.
     */
    restore(): void {
        try {
            if (existsSync(this._storagePath)) {
                const raw = readFileSync(this._storagePath, 'utf-8');
                const parsed = JSON.parse(raw);
                if (typeof parsed === 'object' && parsed !== null) {
                    this._data = parsed;
                }
            }
        } catch {
            // Silently ignore if file is corrupt or missing on first run
        }
    }

    /**
     * Store a value in the session.
     */
    set(key: string, value: unknown): void {
        this._data[key] = value;
    }

    /**
     * Get a stored value.
     */
    get(key: string): unknown {
        return this._data[key];
    }

    /**
     * Clear all session data.
     */
    clear(): void {
        this._data = {};
    }

    /**
     * Stop auto-saving.
     */
    stopAutoSave(): void {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }
}

/**
 * Create a new session instance.
 *
 * Example:
 * const session = createSession({
 *     autoSave: true,
 *     interval: 5000,
 * });
 */
export function createSession(
    options: SessionOptions = {},
): Session {
    return new Session(options);
}
