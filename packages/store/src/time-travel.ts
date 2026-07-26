// ─────────────────────────────────────────────────────
// @termuijs/store — Time-Travel & Snapshot Middleware
// ─────────────────────────────────────────────────────

import type { Store, Middleware } from './store.js';

export interface TimeTravelOptions {
    /** Maximum history depth limit. Default 100. */
    maxHistory?: number;
}

export interface TimeTravelSnapshot<T> {
    id: number;
    timestamp: number;
    state: T;
}

export interface TimeTravelController<T extends object> {
    undo(): boolean;
    redo(): boolean;
    jumpTo(index: number): boolean;
    exportSnapshot(): string;
    importSnapshot(json: string): void;
    clear(): void;
    readonly history: TimeTravelSnapshot<T>[];
    readonly cursor: number;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
}

function cloneState<T>(state: T): T {
    if (typeof structuredClone === 'function') {
        try {
            return structuredClone(state);
        } catch {
            // Fallback for non-serializable objects
        }
    }
    return JSON.parse(JSON.stringify(state));
}

export class TimeTravel<T extends object> implements TimeTravelController<T> {
    private _history: TimeTravelSnapshot<T>[] = [];
    private _cursor = -1;
    private _maxHistory: number;
    private _isTimeTraveling = false;
    private _store: Store<T> | null = null;
    private _nextId = 1;

    constructor(options: TimeTravelOptions = {}) {
        this._maxHistory = options.maxHistory ?? 100;
    }

    bindStore(store: Store<T>): void {
        this._store = store;
        this.clear();
    }

    recordState(nextState: T): void {
        if (this._isTimeTraveling) return;

        // Truncate any redo history if a new state mutation occurs after undo
        if (this._cursor < this._history.length - 1) {
            this._history.splice(this._cursor + 1);
        }

        const snapshot: TimeTravelSnapshot<T> = {
            id: this._nextId++,
            timestamp: Date.now(),
            state: cloneState(nextState),
        };

        this._history.push(snapshot);

        while (this._history.length > this._maxHistory) {
            this._history.shift();
        }

        this._cursor = this._history.length - 1;
    }

    undo(): boolean {
        if (!this.canUndo || !this._store) return false;
        return this.jumpTo(this._cursor - 1);
    }

    redo(): boolean {
        if (!this.canRedo || !this._store) return false;
        return this.jumpTo(this._cursor + 1);
    }

    jumpTo(index: number): boolean {
        if (!this._store || index < 0 || index >= this._history.length) return false;
        this._isTimeTraveling = true;
        try {
            this._cursor = index;
            const targetSnapshot = this._history[index];
            this._store.setState(cloneState(targetSnapshot.state));
            return true;
        } finally {
            this._isTimeTraveling = false;
        }
    }

    exportSnapshot(): string {
        return JSON.stringify({
            cursor: this._cursor,
            history: this._history,
        });
    }

    importSnapshot(json: string): void {
        if (!json || typeof json !== 'string') {
            throw new Error('Invalid snapshot JSON string');
        }
        const data = JSON.parse(json);
        if (!Array.isArray(data.history) || typeof data.cursor !== 'number') {
            throw new Error('Invalid snapshot schema format');
        }

        this._history = data.history.map((h: any) => ({
            id: h.id,
            timestamp: h.timestamp ?? Date.now(),
            state: cloneState(h.state),
        }));

        this._cursor = Math.max(0, Math.min(this._history.length - 1, data.cursor));

        if (this._store && this._history.length > 0) {
            this.jumpTo(this._cursor);
        }
    }

    clear(): void {
        this._history = [];
        this._cursor = -1;
        if (this._store) {
            this.recordState(this._store.getState());
        }
    }

    get middleware(): Middleware<T> {
        return (prevState, update, next) => {
            const nextState = next(update);
            this.recordState(nextState);
        };
    }

    get history(): TimeTravelSnapshot<T>[] {
        return this._history.map((h) => ({ ...h, state: cloneState(h.state) }));
    }

    get cursor(): number {
        return this._cursor;
    }

    get canUndo(): boolean {
        return this._cursor > 0;
    }

    get canRedo(): boolean {
        return this._cursor < this._history.length - 1;
    }
}

export function createTimeTravel<T extends object>(options?: TimeTravelOptions): TimeTravel<T> {
    return new TimeTravel<T>(options);
}
