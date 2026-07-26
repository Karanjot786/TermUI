// ─────────────────────────────────────────────────────
// @termuijs/jsx — useConcurrentReducer Hook
// ─────────────────────────────────────────────────────

import { useState, useCallback, useRef } from '../hooks.js';

export enum Priority {
    Immediate = 'Immediate',
    Background = 'Background',
}

export type ReducerMiddleware<S, A> = (
    action: A,
    priority: Priority,
    next: (action: A) => void,
    state: S
) => void;

export interface ConcurrentReducerOptions<S, A> {
    middleware?: ReducerMiddleware<S, A>[];
}

export type ConcurrentDispatch<A> = (action: A, priority?: Priority) => void;

export function useConcurrentReducer<S, A>(
    reducer: (state: S, action: A) => S,
    initialState: S,
    options?: ConcurrentReducerOptions<S, A>
): [S, ConcurrentDispatch<A>] {
    const [state, setState] = useState<S>(initialState);
    const stateRef = useRef<S>(state);
    stateRef.current = state;

    const reducerRef = useRef(reducer);
    reducerRef.current = reducer;

    const optionsRef = useRef(options);
    optionsRef.current = options;

    const bgQueueRef = useRef<Array<{ action: A; priority: Priority }>>([]);
    const isFlushingRef = useRef(false);

    const applyAction = useCallback((action: A, priority: Priority) => {
        const middlewares = optionsRef.current?.middleware ?? [];

        const executeApply = (act: A) => {
            const nextState = reducerRef.current(stateRef.current, act);
            stateRef.current = nextState;
            setState(nextState);
        };

        if (middlewares.length === 0) {
            executeApply(action);
            return;
        }

        let idx = 0;
        const next = (currAction: A) => {
            if (idx < middlewares.length) {
                const mw = middlewares[idx++];
                mw(currAction, priority, next, stateRef.current);
            } else {
                executeApply(currAction);
            }
        };

        next(action);
    }, []);

    const flushBackgroundQueue = useCallback(() => {
        if (isFlushingRef.current || bgQueueRef.current.length === 0) return;
        isFlushingRef.current = true;

        queueMicrotask(() => {
            try {
                while (bgQueueRef.current.length > 0) {
                    const item = bgQueueRef.current.shift();
                    if (item) {
                        applyAction(item.action, item.priority);
                    }
                }
            } finally {
                isFlushingRef.current = false;
            }
        });
    }, [applyAction]);

    const dispatch: ConcurrentDispatch<A> = useCallback(
        (action: A, priority: Priority = Priority.Immediate) => {
            if (priority === Priority.Immediate) {
                applyAction(action, priority);
            } else {
                bgQueueRef.current.push({ action, priority });
                flushBackgroundQueue();
            }
        },
        [applyAction, flushBackgroundQueue]
    );

    return [state, dispatch];
}
