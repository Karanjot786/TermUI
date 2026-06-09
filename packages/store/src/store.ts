// ─────────────────────────────────────────────────────
// @termuijs/store — Zustand-like State Management
//
// Minimal, powerful state management for terminal apps.
// Create stores with actions, use them in components
// with selector-based subscriptions.
//
// Usage:
//   const useCounter = createStore((set) => ({
//       count: 0,
//       increment: () => set(s => ({ count: s.count + 1 })),
//       reset: () => set({ count: 0 }),
//   }));
//
//   function Counter() {
//       const count = useCounter(s => s.count);
//       const increment = useCounter(s => s.increment);
//       useInput((key) => { if (key === '+') increment(); });
//       return <Text>Count: {count}</Text>;
//   }
// ─────────────────────────────────────────────────────

import { useState, useEffect, useRef } from '@termuijs/jsx';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

// ── Batch Mechanism ──

let _batchDepth = 0;
// Map store instance to { listeners, prevState, nextState }
const _batchStores = new Map<Set<any>, { prevState: any; nextState: any }>();

/**
 * Batch multiple state updates into a single render pass.
 *
 * Coalesces all setState calls within the same microtask tick
 * into a single reconciler update, reducing unnecessary re-renders.
 *
 * ```tsx
 * // Without batch: 3 re-renders
 * store.setState({ x: 1 });
 * store.setState({ y: 2 });
 * store.setState({ z: 3 });
 *
 * // With batch: 1 re-render
 * batch(() => {
 *     store.setState({ x: 1 });
 *     store.setState({ y: 2 });
 *     store.setState({ z: 3 });
 * });
 * ```
 */
export function batch(fn: () => void): void {
    _batchDepth++;
    let threw = false;
    try {
        fn();
    } catch (err) {
        threw = true;
        throw err;
    } finally {
        _batchDepth--;
        if (_batchDepth === 0) {
            if (threw) {
                _batchStores.clear(); // Don't notify listeners with partial state
            } else {
                queueMicrotask(() => {
                    const stores = Array.from(_batchStores.entries());
                    _batchStores.clear();
                    for (const [listeners, { prevState, nextState }] of stores) {
                        for (const listener of listeners) {
                            listener(nextState, prevState);
                        }
                    }
                });
            }
        }
    }
}

// ── Types ──

export type SetState<T> = (
    partial: Partial<T> | ((state: T) => Partial<T>),
) => void;

export type GetState<T> = () => T;

export type StateCreator<T> = (
    set: SetState<NoInfer<T>>,
    get: GetState<NoInfer<T>>,
) => T;

export type Selector<T, U> = (state: T) => U;

export type Listener<T> = (state: T, prevState: T) => void;

export type Middleware<T> = (
    prevState: T,
    update: Partial<T>,
    next: (transformedUpdate: Partial<T>) => T,
) => void;

export interface PersistOptions {
    key?: string;
    file?: string;
    debounceMs?: number;
}

export interface StoreOptions<T> {
    middleware?: Middleware<T>[];
    persist?: PersistOptions;
}

export const logger: Middleware<any> = (prevState, update, next) => {
    // console.log is forbidden in TermUI source files.
    // To debug state changes, write to a file instead.
    const nextState = next(update);
};

export interface Computed<U> {
    /** Get the current memoized derived value */
    get(): U;
    /** Subscribe to changes — listener fires only when the derived value changes */
    subscribe(listener: (value: U) => void): () => void;
}

export interface Store<T> {
    /** Get the current state */
    getState(): T;
    /** Set partial state (like React's setState) */
    setState: SetState<T>;
    /** Subscribe to state changes */
    subscribe(listener: Listener<T>): () => void;
    /** Destroy the store and remove all listeners */
    destroy(): void;
    /** Create a memoized selector — subscribers are notified only when the derived value changes */
    computed<U>(selector: Selector<T, U>): Computed<U>;
    /** Restore state to the value captured at creation */
    reset(): void;
    
    /** Read the state captured at creation */
    getInitialState(): T;
}

// ── Store Implementation ──

/**
 * Create a new store. Returns a hook function that can be
 * called inside components with an optional selector.
 *
 * ```tsx
 * const useAppStore = createStore((set, get) => ({
 *     count: 0,
 *     todos: [] as string[],
 *     increment: () => set(s => ({ count: s.count + 1 })),
 *     addTodo: (text: string) => set(s => ({
 *         todos: [...s.todos, text]
 *     })),
 *     get totalItems() { return get().todos.length; },
 * }));
 *
 * // In a component:
 * function Counter() {
 *     const count = useAppStore(s => s.count);
 *     return <Text>Count: {count}</Text>;
 * }
 * ```
 */
// ── App Config Directory Resolver ──

function getAppConfigDir(): string {
    const home = os.homedir();
    if (process.platform === 'win32') {
        return process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    }
    if (process.platform === 'darwin') {
        return path.join(home, 'Library', 'Application Support');
    }
    return process.env.XDG_CONFIG_HOME || path.join(home, '.config');
}

export function createStore<T extends object>(
    creator: StateCreator<T>,
    options?: StoreOptions<T>
): UseStore<T>;

export function createStore<T extends object>(
    state: T,
    options?: StoreOptions<T>
): UseStore<T>;

export function createStore<T extends object>(
    creator: any,
    options?: StoreOptions<T>
): UseStore<T> {
    const listeners = new Set<Listener<T>>();

    let state: T;
    let writeTimeout: NodeJS.Timeout | null = null;

    // Resolve file path if persist option is set
    let persistFilePath = '';
    if (options?.persist) {
        const persistOpt = options.persist;
        if (persistOpt.file) {
            persistFilePath = path.isAbsolute(persistOpt.file)
                ? persistOpt.file
                : path.join(getAppConfigDir(), persistOpt.file);
        } else if (persistOpt.key) {
            persistFilePath = path.join(getAppConfigDir(), `${persistOpt.key}.json`);
        }
    }

    const persistState = () => {
        if (!persistFilePath) return;

        const debounceMs = options?.persist?.debounceMs ?? 100;

        if (writeTimeout) {
            clearTimeout(writeTimeout);
        }

        writeTimeout = setTimeout(() => {
            try {
                const dir = path.dirname(persistFilePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                const dataToSave: any = {};
                for (const [key, val] of Object.entries(state)) {
                    if (typeof val !== 'function') {
                        dataToSave[key] = val;
                    }
                }
                fs.writeFileSync(persistFilePath, JSON.stringify(dataToSave), 'utf8');
            } catch (err) {
                // Ignore write errors to keep terminal stable
            }
        }, debounceMs);
    };

    const setState: SetState<T> = (partial) => {
        const prevState = state;
        const nextPartial = typeof partial === 'function'
            ? (partial as (state: T) => Partial<T>)(state)
            : partial;

        const applyUpdate = (finalPartial: Partial<T>): T => {
            const nextState = { ...state, ...finalPartial };

            // Only notify if at least one key's value actually changed
            const hasChanged = Object.keys(finalPartial).some(
                key => !Object.is((state as any)[key], (nextState as any)[key])
            );
            if (hasChanged) {
                state = nextState;
                if (_batchDepth > 0) {
                    // We're in a batch: defer listener notifications and track the final state
                    const existing = _batchStores.get(listeners);
                    if (!existing) {
                        _batchStores.set(listeners, { prevState, nextState });
                    } else {
                        // Update to the new nextState, but keep the original prevState
                        existing.nextState = nextState;
                    }
                } else {
                    // Not in a batch: notify immediately
                    for (const listener of listeners) {
                        listener(state, prevState);
                    }
                }
                persistState();
            }
            return state;
        };

        if (options?.middleware && options.middleware.length > 0) {
            let index = -1;
            const dispatch = (i: number, currentPartial: Partial<T>): T => {
                if (i <= index) throw new Error('next() called multiple times');
                index = i;
                if (i === options.middleware!.length) {
                    return applyUpdate(currentPartial);
                }
                let res: T | undefined;
                const mw = options.middleware![i];
                mw(prevState, currentPartial, (transformed) => {
                    res = dispatch(i + 1, transformed);
                    return res;
                });
                return res !== undefined ? res : state;
            };
            dispatch(0, nextPartial);
        } else {
            applyUpdate(nextPartial);
        }
    };

    const getState: GetState<T> = () => state;

    const subscribe = (listener: Listener<T>): (() => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };

    const destroy = (): void => {
        listeners.clear();
        if (writeTimeout) {
            clearTimeout(writeTimeout);
            writeTimeout = null;
        }
    };

    // Initialize state (supports creator functions or plain objects)
    state = typeof creator === 'function'
        ? (creator as StateCreator<T>)(setState, getState)
        : { ...(creator as any) } as T;
    
    // Capture initial state BEFORE persist rehydration
    const initialState = structuredClone(
        Object.fromEntries(
            Object.entries(state).filter(
                ([, value]) => typeof value !== 'function',
            ),
        ),
    ) as Partial<T>;
    
    const getInitialState = (): T => {
        return structuredClone(initialState) as T;
    };
    
    const reset = (): void => {
        setState(structuredClone(initialState) as Partial<T>);
    };

    // Rehydrate saved state if persist file exists
    if (persistFilePath) {
        try {
            if (fs.existsSync(persistFilePath)) {
                const content = fs.readFileSync(persistFilePath, 'utf8');
                const saved = JSON.parse(content);
                state = { ...state, ...saved };
            }
        } catch (err) {
            // Safely ignore rehydration reading/parsing issues
        }
    }

    const computed = <U>(selector: Selector<T, U>): Computed<U> => {
        // Seed cachedValue from current state — state is guaranteed initialized here
        let cachedValue = selector(state);
        const computedListeners = new Set<(value: U) => void>();

        // Piggyback on the store's own subscribe — recompute on every state change
        // but only notify computed subscribers when the derived value actually changes
        subscribe((newState) => {
            const newValue = selector(newState);
            if (!Object.is(cachedValue, newValue)) {
                cachedValue = newValue;
                for (const listener of computedListeners) {
                    listener(newValue);
                }
            }
        });

        return {
            get: () => cachedValue,
            subscribe: (listener) => {
                computedListeners.add(listener);
                return () => { computedListeners.delete(listener); };
            },
        };
    };

    const store: Store<T> = { getState, setState, subscribe, destroy, computed, reset, getInitialState };

    // Create the hook function
    function useStore(): T;
    function useStore<U>(selector: Selector<T, U>): U;
    function useStore<U>(selector?: Selector<T, U>): T | U {
        const select = selector ?? ((s: T) => s as unknown as U);

        // Use useState to trigger re-renders
        const [selectedState, setSelectedState] = useState(() => select(store.getState()));
        const selectorRef = useRef(select);
        selectorRef.current = select;

        useEffect(() => {
            const unsubscribe = store.subscribe((newState) => {
                const newSelected = selectorRef.current(newState);
                setSelectedState(newSelected);
            });
            return unsubscribe;
        }, []);

        return selectedState;
    }

    // Attach store methods to the hook for direct access
    (useStore as any).getState = getState;
    (useStore as any).setState = setState;
    (useStore as any).subscribe = subscribe;
    (useStore as any).destroy = destroy;
    (useStore as any).computed = computed;
    (useStore as any).reset = reset;
    (useStore as any).getInitialState = getInitialState;

    return useStore as UseStore<T>;
}

// ── Hook Type ──

export interface UseStore<T> {
    (): T;
    <U>(selector: Selector<T, U>): U;
    getState: GetState<T>;
    setState: SetState<T>;
    subscribe(listener: Listener<T>): () => void;
    destroy(): void;
    computed<U>(selector: Selector<T, U>): Computed<U>;
    reset(): void;
    getInitialState(): T;
}
