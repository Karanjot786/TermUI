// ─────────────────────────────────────────────────────
// @termuijs/jsx — useHistory hook
// ─────────────────────────────────────────────────────

import { useState, useCallback } from '../hooks.js';

export interface UseHistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

export interface UseHistoryActions<T> {
    set: (newPresent: T) => void;
    undo: () => void;
    redo: () => void;
    clear: () => void;
    canUndo: boolean;
    canRedo: boolean;
    history: UseHistoryState<T>;
}

/**
 * useHistory — state management hook for tracking past, present, and future state stacks
 * with undo/redo capabilities.
 *
 * @param initialPresent Initial state value
 */
export function useHistory<T>(initialPresent: T): [T, UseHistoryActions<T>] {
    const [history, setHistory] = useState<UseHistoryState<T>>({
        past: [],
        present: initialPresent,
        future: [],
    });

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

    const undo = useCallback(() => {
        setHistory((currentState) => {
            if (currentState.past.length === 0) return currentState;

            const previous = currentState.past[currentState.past.length - 1];
            const newPast = currentState.past.slice(0, currentState.past.length - 1);

            return {
                past: newPast,
                present: previous,
                future: [currentState.present, ...currentState.future],
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory((currentState) => {
            if (currentState.future.length === 0) return currentState;

            const next = currentState.future[0];
            const newFuture = currentState.future.slice(1);

            return {
                past: [...currentState.past, currentState.present],
                present: next,
                future: newFuture,
            };
        });
    }, []);

    const set = useCallback((newPresent: T) => {
        setHistory((currentState) => {
            if (Object.is(currentState.present, newPresent)) return currentState;

            return {
                past: [...currentState.past, currentState.present],
                present: newPresent,
                future: [],
            };
        });
    }, []);

    const clear = useCallback(() => {
        setHistory((currentState) => ({
            past: [],
            present: currentState.present,
            future: [],
        }));
    }, []);

    return [
        history.present,
        {
            set,
            undo,
            redo,
            clear,
            canUndo,
            canRedo,
            history,
        },
    ];
}
