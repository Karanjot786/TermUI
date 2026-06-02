// ─────────────────────────────────────────────────────
// @termuijs/store — Slices helper
//
// Composes a single store state from multiple independent
// named slice definitions. Each slice receives the full
// store's set/get, allowing cross-slice reads and actions.
// ─────────────────────────────────────────────────────

import type { SetState, GetState, StateCreator } from './store.js';

/**
 * A slice definition — a function that receives the full store's
 * set/get and returns the state contributed by this slice.
 *
 * `TStore` defaults to `object` so callers can omit it when composing
 * via `slices<CombinedType>()`, which infers the full store type.
 * The `any` default is intentional: at the point of individual slice
 * definition the combined store type is not yet known.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SliceDef<TSlice, TStore extends object = any> = (
    set: SetState<TStore>,
    get: GetState<TStore>,
) => TSlice;

/**
 * slices — compose a single store state from multiple named slice definitions.
 *
 * Returns a `StateCreator` that can be passed directly to `createStore`.
 * Each slice is merged left-to-right into the combined state object.
 * Slices can read each other's state and call each other's actions via `get()`.
 *
 * ```typescript
 * type StoreState = CounterSlice & LabelSlice;
 *
 * const useStore = createStore(
 *     slices<StoreState>({
 *         counter: (set) => ({
 *             count: 0,
 *             inc: () => set((s) => ({ count: s.count + 1 })),
 *             reset: () => set({ count: 0 }),
 *         }),
 *         label: (set) => ({
 *             text: 'hello',
 *             setLabel: (t: string) => set({ text: t }),
 *         }),
 *     })
 * );
 * ```
 */
export function slices<T extends object>(
    defs: Record<string, SliceDef<Partial<T>, T>>,
): StateCreator<T> {
    return (set, get) => {
        let combined = {} as T;
        for (const creator of Object.values(defs)) {
            combined = { ...combined, ...creator(set, get) };
        }
        return combined;
    };
}
