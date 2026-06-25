import type { Middleware } from '../store.js';

export interface UndoRedoOptions {
    /** Maximum number of states to keep in history */
    limit?: number;
}

export interface UndoRedoMiddleware<T> extends Middleware<T> {
    undo: () => void;
    redo: () => void;
    clear: () => void;
    getHistory: () => { past: T[]; present: T | undefined; future: T[] };
}

/**
 * Undo/Redo middleware.
 * Maintains a state history stack. Attach methods to the middleware itself.
 * 
 * ```ts
 * const history = undoRedo({ limit: 50 });
 * const store = createStore(..., { middleware: [history] });
 * 
 * history.undo();
 * ```
 */
export function undoRedo<T>(options?: UndoRedoOptions): UndoRedoMiddleware<T> {
    const limit = options?.limit ?? 50;
    
    let past: T[] = [];
    let present: T | undefined = undefined;
    let future: T[] = [];
    
    // We need a way to trigger an update without the user calling set().
    // However, middleware only intercepts updates, it cannot INITIATE updates on its own
    // unless it captures the `next` function or we pass an updater.
    // Wait, the middleware gets `next` on EVERY dispatch. 
    // We can capture the most recent `next`! But `next` might only apply the given partial.
    // Actually, `next` applies a partial to the base state. 
    // If we pass the FULL state as the partial, it will overwrite everything.
    
    let globalSet: any = null;

    const mw = ((prevState: T, update: Partial<T>, next: any, actionName: string | undefined, abort: () => void, set: any) => {
        globalSet = set;

        // Ignore internal temporal actions
        if (actionName === '@@UNDO' || actionName === '@@REDO' || actionName === '@@CLEAR') {
            return next(update, actionName);
        }

        if (present === undefined) {
            present = prevState;
        }

        // Apply update
        const res = next(update, actionName);

        const recordState = (newState: T) => {
            if (present !== undefined) {
                past.push(present);
                if (past.length > limit) {
                    past.shift();
                }
            }
            present = newState;
            future = [];
        };

        if (res && typeof (res as any).then === 'function') {
            (res as Promise<T>).then(recordState);
        } else {
            recordState(res as T);
        }

        return true;
    }) as UndoRedoMiddleware<T>;

    mw.undo = () => {
        if (past.length === 0 || !globalSet || present === undefined) return;
        const previous = past.pop()!;
        future.unshift(present);
        present = previous;
        globalSet(previous as Partial<T>, '@@UNDO');
    };

    mw.redo = () => {
        if (future.length === 0 || !globalSet || present === undefined) return;
        const nextState = future.shift()!;
        past.push(present);
        present = nextState;
        globalSet(nextState as Partial<T>, '@@REDO');
    };

    mw.clear = () => {
        past = [];
        future = [];
    };

    mw.getHistory = () => ({
        past: [...past],
        present,
        future: [...future]
    });

    return mw;
}
