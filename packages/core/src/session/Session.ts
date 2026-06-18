// ─────────────────────────────────────────────────────
// @termuijs/core — Session Management API
// ─────────────────────────────────────────────────────

export interface SessionOptions {
    /** Enable automatic session saving */
    autoSave?: boolean;

    /** Auto-save interval in milliseconds */
    interval?: number;
}

export interface SessionData {
    [key: string]: unknown;
}

export class Session {
    private _data: SessionData = {};
    private _timer?: ReturnType<typeof setInterval>;

    constructor(private _options: SessionOptions = {}) {
        // Start auto-save if enabled
        if (this._options.autoSave) {
            this._timer = setInterval(() => {
                this.save();
            }, this._options.interval ?? 5000);
        }
    }

    /**
     * Save current session data.
     * In future this can be connected
     * to files, databases, or custom storage.
     */
    save(): void {
    }

    /**
     * Restore previous session.
     */
    restore(): void {
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