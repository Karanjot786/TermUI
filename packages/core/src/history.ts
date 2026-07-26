// ─────────────────────────────────────────────────────
// @termuijs/core — History Manager
// ─────────────────────────────────────────────────────

export interface HistoryOptions {
    maxSize?: number;
}

export class History<T> {
    private undoStack: T[] = [];
    private redoStack: T[] = [];
    private readonly maxSize: number;

    constructor(options: HistoryOptions = {}) {
        this.maxSize = options.maxSize ?? 100;
    }

    push(state: T): void {
        this.undoStack.push(state);

        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }

        this.redoStack = [];
    }

    undo(): T | undefined {
        if (this.undoStack.length <= 1) {
            return this.undoStack[0];
        }

        const current = this.undoStack.pop();

        if (current !== undefined) {
            this.redoStack.push(current);
        }

        return this.undoStack[this.undoStack.length - 1];
    }

    redo(): T | undefined {
        const state = this.redoStack.pop();

        if (state !== undefined) {
            this.undoStack.push(state);
        }

        return state;
    }

    current(): T | undefined {
        return this.undoStack[this.undoStack.length - 1];
    }

    canUndo(): boolean {
        return this.undoStack.length > 1;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}

export function createHistory<T>(
    options?: HistoryOptions,
): History<T> {
    return new History<T>(options);
}