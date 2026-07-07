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
import { produce } from 'immer';
import { useState, useEffect, useRef } from '@termuijs/jsx';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import type { EqualityFn } from './shallow.js'


// ── Batch Mechanism ──

interface BatchEntry<T> {
    prevState: T;
    nextState: T;
    changes: Partial<T>;
    commit: () => T;
    rollback: () => void;
}

let _batchDepth = 0;
let _batchEpoch = 0;
// Map store instance to batch entry. Using any for listener set type because
// the batch mechanism operates on the raw Set<Listener<T>> without knowing T at this level.
const _batchStores = new Map<Set<any>, BatchEntry<any>>();
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
export function batch<T>(fn: () => T): T {
    const isOutermost = _batchDepth === 0;
    _batchDepth++;
    if (isOutermost) _batchEpoch++;
    let threw = false;
    let res: any;
    try {
        res = fn();
    } catch (err) {
        threw = true;
        _batchDepth--;
        if (_batchDepth === 0) {
            flushBatch(threw);
        }
        throw err;
    }

    if (res && typeof res.then === 'function') {
        return (res as Promise<any>).then(
            (val) => {
                _batchDepth--;
                if (_batchDepth === 0) flushBatch(false, true);
                return val;
            },
            (err) => {
                _batchDepth--;
                if (_batchDepth === 0) flushBatch(true, true);
                throw err;
            }
        ) as T;
    } else {
        _batchDepth--;
        if (_batchDepth === 0) {
            flushBatch(false);
        }
        return res;
    }
}

function flushBatch(threw: boolean, immediate = false) {
    if (threw) {
        for (const [, { rollback }] of _batchStores) {
            rollback();
        }
        _batchStores.clear();
    } else {
        if (_batchStores.size === 0) return;
        // Snapshot the current epoch so the microtask can bail out if a new
        // batch has started before it runs.
        const epochAtFlush = _batchEpoch;
        const notify = () => {
            // A new batch started between flush and notify — skip.
            if (_batchEpoch !== epochAtFlush) return;
            const stores = Array.from(_batchStores.entries());
            _batchStores.clear();
            const newStates = new Map<Set<any>, any>();
            for (const [listeners, { commit }] of stores) {
                newStates.set(listeners, commit());
            }
            for (const [listeners, { prevState }] of stores) {
                const newState = newStates.get(listeners);
                try {
                    for (const listener of listeners) {
                        listener(newState, prevState);
                    }
                } catch (e) {
                    for (const [, entry] of stores) {
                        entry.rollback();
                    }
                    throw e;
                }
            }
        };
        if (immediate) {
            notify();
        } else {
            queueMicrotask(notify);
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

export interface Computed<U> {
    /** Get the current memoized derived value */
    get(): U;
    /** Subscribe to changes — listener fires only when the derived value changes */
    subscribe(listener: (value: U) => void): () => void;
    /** Remove the internal store subscription and clear all computed listeners — call when done to prevent memory leaks */
    dispose(): void;
}

export interface Store<T> {
    getState(): T;
    setState: SetState<T>;
    mutate(recipe: (draft: T) => void): void;
    subscribe(listener: Listener<T>): () => void;
    /** Subscribe once — listener fires on the next change and is immediately unsubscribed */
    subscribeOnce(listener: Listener<T>): () => void;
    /** Destroy the store and remove all listeners */
    destroy(): void;
    /** Create a memoized selector — subscribers are notified only when the derived value changes */
    computed<U>(selector: Selector<T, U>): Computed<U>;
    /** Restore state to the value captured at creation */
    reset(): void;
    
    /** Read the state captured at creation */
    getInitialState(): T;
}

// ── Safe Deep Clone Helper ──
function safeDeepClone<T>(obj: T, seen = new WeakMap()): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (seen.has(obj as any)) return seen.get(obj as any);

    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as any;
    
    if (obj instanceof Map) {
        const m = new Map();
        seen.set(obj as any, m);
        for (const [k, v] of obj) m.set(k, safeDeepClone(v, seen));
        return m as any;
    }
    if (obj instanceof Set) {
        const s = new Set();
        seen.set(obj as any, s);
        for (const v of obj) s.add(safeDeepClone(v, seen));
        return s as any;
    }
    if (obj instanceof ArrayBuffer) {
        const buf = new ArrayBuffer(obj.byteLength);
        new Uint8Array(buf).set(new Uint8Array(obj));
        return buf as any;
    }
    if (Array.isArray(obj)) {
        const arr = [] as any[];
        seen.set(obj as any, arr);
        for (let i = 0; i < obj.length; i++) {
            arr[i] = safeDeepClone(obj[i], seen);
        }
        return arr as any;
    }

    const cloned = {} as Record<string | symbol, any>;
    seen.set(obj as any, cloned);

    const keys = Reflect.ownKeys(obj as any);
    for (const key of keys) {
        const value = (obj as any)[key];
        // Filter out functions from initial state capture
        if (typeof value === 'function') continue; 
        try {
            cloned[key] = safeDeepClone(value, seen);
        } catch (e) {
            cloned[key] = value;
        }
    }
    return cloned as T;
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
    creator: any, // overloaded: accepts StateCreator<T> function or plain T object
    options?: StoreOptions<T>
): UseStore<T> {
    const listeners = new Set<Listener<T>>();

    let state: T;
    let writeTimeout: NodeJS.Timeout | null = null;

    // Resolve file path if persist option is set
    let persistFilePath = '';
    if (options?.persist) {
        const persistOpt = options.persist;
        const persistDir = path.join(getAppConfigDir(), 'termuijs-stores');
        if (persistOpt.file) {
            persistFilePath = path.isAbsolute(persistOpt.file)
                ? persistOpt.file
                : path.join(persistDir, persistOpt.file);
            const resolvedPath = path.resolve(persistFilePath);
            // Use path.relative for containment: startsWith() is bypassable by a
            // sibling dir sharing the prefix (e.g. `${persistDir}-evil/x.json`).
            const rel = path.relative(path.resolve(persistDir), resolvedPath);
            if (rel.startsWith('..') || path.isAbsolute(rel)) {
                throw new Error(`Persist file path must be within ${persistDir}`);
            }
            persistFilePath = resolvedPath;
        } else if (persistOpt.key) {
            if (!/^[a-zA-Z0-9._-]+$/.test(persistOpt.key)) {
                throw new Error('Persist key must contain only alphanumeric characters, hyphens, underscores, and dots.');
            }
            persistFilePath = path.join(persistDir, `${persistOpt.key}.json`);
        }
        // Resolve symlinks in the persist directory to prevent writes through
        // symlink targets (e.g., ~/.config or ~/AppData/Roaming being a symlink).
        // Walk up from the file to find the first existing ancestor, resolve it,
        // and reconstruct the remainder.
        try {
            const dir = path.dirname(persistFilePath);
            if (fs.existsSync(dir)) {
                persistFilePath = path.join(fs.realpathSync(dir), path.basename(persistFilePath));
            } else {
                const segments: string[] = [];
                let current = dir;
                while (!fs.existsSync(current)) {
                    segments.unshift(path.basename(current));
                    current = path.dirname(current);
                }
                persistFilePath = path.join(fs.realpathSync(current), ...segments, path.basename(persistFilePath));
            }
        } catch {
            // If realpath fails (permissions, etc.), use the unresolved path
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
                const dataToSave: Record<string, unknown> = {};
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

        // When in a batch, function updaters should see the pending batch state
        const batchState: T = _batchDepth > 0 ? _batchStores.get(listeners)?.nextState ?? state : state;
        const nextPartial = typeof partial === 'function'
            ? (partial as (state: T) => Partial<T>)(batchState)
            : partial;

        const applyUpdate = (finalPartial: Partial<T>): T => {
            // When in a batch, compute nextState from pending batch state if available
            const baseState: T = _batchDepth > 0 ? _batchStores.get(listeners)?.nextState ?? state : state;
            const nextState = { ...baseState, ...finalPartial };

            // Only notify if at least one key's value actually changed
            // Type assertion needed because Object.keys returns string[] but state access requires keyof T
            const hasChanged = Object.keys(finalPartial).some(
                key => !Object.is((baseState as any)[key], (nextState as any)[key])
            );
            if (hasChanged) {
                if (_batchDepth > 0) {
                    // We're in a batch: defer listener notifications and track the final state
                    const existing = _batchStores.get(listeners);
                    if (!existing) {
                        // Track only the keys changed inside the batch so commit can merge
                        // onto any intermediate non-batched updates without overwriting them.
                        const changes: Partial<T> = { ...finalPartial };
                        _batchStores.set(listeners, {
                            prevState,
                            nextState,
                            changes,
                            commit: () => { state = { ...state, ...changes } as T; persistState(); return state; },
                            rollback: () => { state = prevState; },
                        });
                    } else {
                        Object.assign(existing.changes, finalPartial);
                        existing.nextState = nextState;
                    }
                } else {
                    state = nextState; 
                    // Not in a batch: notify immediately
                    for (const listener of listeners) {
                        listener(state, prevState);
                    }
                    persistState();
                }
                
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

    const getState: GetState<T> = () => {
        if (_batchDepth > 0) {
            const entry = _batchStores.get(listeners);
            if (entry) return entry.nextState;
        }
        return state;
    };

    const subscribe = (listener: Listener<T>): (() => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };

    const subscribeOnce = (listener: Listener<T>): (() => void) => {
        let unsub: (() => void) | null = null;
        const wrapper: Listener<T> = (state, prevState) => {
            const currentUnsub = unsub;
            if (currentUnsub) {
                currentUnsub();
                unsub = null;
            }
            listener(state, prevState);
        };
        unsub = subscribe(wrapper);
        return () => {
            if (unsub) {
                unsub();
                unsub = null;
            }
        };
    };

    const destroy = (): void => {
        listeners.clear();
        if (writeTimeout) {
            clearTimeout(writeTimeout);
            writeTimeout = null;
        }
    };
    const mutate = (recipe: (draft: T) => void): void => {
        const prevState = state;
        // When in a batch, produce from pending batch state
        const baseState: T = _batchDepth > 0 ? _batchStores.get(listeners)?.nextState ?? state : state;
        const nextState = produce(baseState, (draft) => {
            recipe(draft as T);
        });
        if (Object.is(baseState, nextState)) {
            return;
        }
        if (_batchDepth > 0) {
            const existing = _batchStores.get(listeners);
            // Compute which keys actually changed so commit can merge instead of replace
            const changedKeys = Object.keys(nextState).filter(
                k => !Object.is((nextState as any)[k], (baseState as any)[k])
            );
            const changes: Partial<T> = {};
            for (const k of changedKeys) {
                (changes as any)[k] = (nextState as any)[k];
            }
            if (!existing) {
                _batchStores.set(listeners, {
                    prevState,
                    nextState,
                    changes,
                    commit: () => { state = { ...state, ...changes } as T; persistState(); return state; },
                    rollback: () => { state = prevState; },
                });
            } else {
                Object.assign(existing.changes, changes);
                existing.nextState = nextState;
                existing.commit = () => { state = nextState; persistState(); };
                existing.rollback = () => { state = existing.prevState; };
            }
        } else {
            state = nextState;
            for (const listener of listeners) {
                listener(nextState, prevState);
            }
            persistState();
        }
    };
    // Initialize state (supports creator functions or plain objects)
    state = typeof creator === 'function'
        ? (creator as StateCreator<T>)(setState, getState)
        // Type assertion needed because spread loses precise type information
        : { ...(creator as any) } as T;
    
    // Capture initial state BEFORE persist rehydration
    const initialState = safeDeepClone(state) as Partial<T>;
    
    const getInitialState = (): T => {
        return safeDeepClone(initialState) as T;
    };
    
    const reset = (): void => {
        setState(safeDeepClone(initialState) as Partial<T>);
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
        const storeUnsub = subscribe((newState) => {
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
            dispose: () => {
                storeUnsub();
                computedListeners.clear();
            },
        };
    };

    const store: Store<T> = { getState, setState, mutate, subscribe, subscribeOnce, destroy, computed, reset, getInitialState };

    // Create the hook function
    function useStore(): T;
    function useStore<U>(selector: Selector<T, U>, equalityFn?: EqualityFn<U>): U;
    function useStore<U>(selector?: Selector<T, U>, equalityFn?: EqualityFn<U>): T | U {
        const select = selector ?? ((s: T) => s as unknown as U);

        // Use useState to trigger re-renders
        const [selectedState, setSelectedState] = useState(() => select(store.getState()));
        const selectorRef = useRef(select);
        selectorRef.current = select;

        // Store equalityFn in a ref to avoid stale closures
        const equalityRef = useRef<EqualityFn<U> | undefined>(equalityFn as EqualityFn<U> | undefined);
        equalityRef.current = equalityFn as EqualityFn<U> | undefined;

        useEffect(() => {
            let prevSelected = selectorRef.current(store.getState());
            const unsubscribe = store.subscribe((newState) => {
                const newSelected = selectorRef.current(newState);
                const areEqual = equalityRef.current
                    ? equalityRef.current(prevSelected as U, newSelected as U)
                    : Object.is(prevSelected, newSelected);
                if (!areEqual) {
                    prevSelected = newSelected;
                    setSelectedState(newSelected);
                }
            });
            return unsubscribe;
        }, []);

        return selectedState;
    }

    // Attach store methods to the hook for direct access
    // Type assertion needed to attach methods to the hook function beyond its call signature
    (useStore as any).getState = getState;
    (useStore as any).setState = setState;
    (useStore as any).mutate = mutate;
    (useStore as any).subscribe = subscribe;
    (useStore as any).subscribeOnce = subscribeOnce;
    (useStore as any).destroy = destroy;
    (useStore as any).computed = computed;
    (useStore as any).reset = reset;
    (useStore as any).getInitialState = getInitialState;

    return useStore as UseStore<T>;
}

// ── Hook Type ──

export interface UseStore<T> {
    (): T;
    <U>(selector: Selector<T, U>, equalityFn?: EqualityFn<U>): U;
    getState: GetState<T>;
    setState: SetState<T>;
    mutate(recipe: (draft: T) => void): void;
    subscribe(listener: Listener<T>): () => void;
    subscribeOnce(listener: Listener<T>): () => void;
    destroy(): void;
    computed<U>(selector: Selector<T, U>): Computed<U>;
    reset(): void;
    getInitialState(): T;
}

