// ─────────────────────────────────────────────────────
// @termuijs/store — Temporal history store (undo / redo)
// ─────────────────────────────────────────────────────

/**
 * TemporalHistory — a compact immutable history representation for a
 * value of type `T`.
 *
 * - `past`: previous states in chronological order (oldest -> newest)
 * - `present`: the current state
 * - `future`: undone states (newest -> oldest)
 */
export interface TemporalHistory<T> {
    past: T[];
    present: T;
    future: T[]
}

/**
 * TemporalStoreActions — public API returned by `createHistoryStore`.
 *
 * - `set(newState)`: push a new state onto the timeline (clears `future`).
 * - `undo()`: move the most recent past state into `present` and push the
 *   previous `present` onto `future`.
 * - `redo()`: move the first `future` state into `present` and append the
 *   previous `present` to `past`.
 * - `getHistory()`: defensive copy of the current timeline.
 * - `present`: readonly getter for the current state.
 */
export interface TemporalStoreActions<T> {
    set: (newState: T) => void;
    undo: () => void;
    redo: () => void;
    getHistory: () => TemporalHistory<T>;
    readonly present: T;
}

/**
 * createHistoryStore — create an in-memory temporal store for `initialPresent`.
 *
 * The implementation uses simple structural equality via `JSON.stringify`
 * to avoid pushing identical consecutive states. The timeline is kept
 * immutable from the caller's perspective: `getHistory()` returns copies
 * of the arrays so external consumers cannot mutate internal state.
 */
export function createHistoryStore<T>(initialPresent: T): TemporalStoreActions<T> {
    let timeline: TemporalHistory<T> = {
        past: [],
        present: initialPresent,
        future: [],
    }

    return {
        // Readonly accessor for the current state.
        get present(): T {
            return timeline.present;
        },

        // Push a new state if it is different from the current `present`.
        set(newState: T): void {
            if (Object.is(timeline.present, newState)) return;

            timeline = {
                past: [...timeline.past, timeline.present],
                present: newState,
                future: []  // New actions break old future timelines
            }
        },

        // Revert to the most recent past state (if any).
        undo(): void {
            if (timeline.past.length == 0) return;

            const prev = timeline.past[timeline.past.length - 1];
            const newPast = timeline.past.slice(0, timeline.past.length - 1)

            timeline = {
                past: newPast,
                present: prev,
                future: [timeline.present, ...timeline.future]
            }
        },

        // Advance into the next future state (if any).
        redo(): void {
            if (timeline.future.length == 0) return;

            const next = timeline.future[0];
            const newFuture = timeline.future.slice(1)

            timeline = {
                past: [...timeline.past, timeline.present],
                present: next,
                future: newFuture
            }
        },

        // Return a defensive copy of the timeline.
        getHistory(): TemporalHistory<T> {
            return {
                past: [...timeline.past],
                present: timeline.present,
                future: [...timeline.future]
            }
        }
    }
}