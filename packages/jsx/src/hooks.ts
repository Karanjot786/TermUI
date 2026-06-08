// ─────────────────────────────────────────────────────
// @termuijs/jsx — Hooks Engine
//
// A minimal React-like hooks runtime. Each functional
// component gets a Fiber that tracks its hook state.
// Hooks are called in order — same rules as React.
// ─────────────────────────────────────────────────────

import type { KeyEvent } from '@termuijs/core';
import { caps } from '@termuijs/core';
import { timerPoolSubscribe } from '@termuijs/motion';
import type { FC } from './vnode.js';

// ── Fiber — per-component-instance state ──

export interface ChildFiberEntry {
    fiber: Fiber;
    component: FC<any>;
}

export interface Fiber {
    id: number;
    hooks: HookState[];
    hookIndex: number;
    isDirty: boolean;
    onInput?: (event: KeyEvent) => void;
    effects: EffectRecord[];
    layoutEffects: EffectRecord[];
    cleanups: (() => void)[];
    intervals: ReturnType<typeof setInterval>[];
    /** Context values provided by this fiber's component */
    contextValues: Map<symbol, any>;
    /** Parent fiber for context lookup */
    parent?: Fiber;
    // ── ErrorBoundary fields ──
    /** True when this fiber is an ErrorBoundary component */
    isErrorBoundary?: true;
    /** Called with the caught error; returns the fallback VNode to render */
    errorFallback?: (err: Error) => import('./vnode.js').VNode;
    // ── Child fiber identity (for fiber reuse across re-renders) ──
    /** Child fibers from current render, keyed by "${index}:${componentName}" */
    childFibers?: Map<string, ChildFiberEntry>;
    /** Child fibers from previous render — used for lookup then cleaned up */
    _prevChildFibers?: Map<string, ChildFiberEntry>;
    /** Next child render index, reset by setCurrentFiber each render pass */
    _nextChildIdx?: number;
}

interface HookState {
    value: any;
    deps?: any[];
}

interface EffectRecord {
    effect: () => void | (() => void);
    deps?: any[];
    cleanup?: () => void;
    ran: boolean;
}

// ── Global state ──

let _currentFiber: Fiber | null = null;
let _requestRender: (() => void) | null = null;
let _insertBefore: ((line: string) => (() => void) | void) | null = null;
let _nextFiberId = 0;
let _nextHookId = 0;
export function useId(): string {
    const fiber = currentFiber();
    const idx = fiber.hookIndex++;

    if (idx >= fiber.hooks.length) {
        fiber.hooks.push({
            value: `id-${++_nextHookId}`,
        });
    }

    return fiber.hooks[idx].value;
}

/** Get or throw the current fiber (hooks must be called inside a component) */
export function currentFiber(): Fiber {
    if (!_currentFiber) {
        throw new Error(
            'Hooks can only be called inside a functional component. ' +
            'Make sure you are not calling hooks outside of a render cycle.'
        );
    }
    return _currentFiber;
}

/** Set the current render context */
export function setCurrentFiber(fiber: Fiber): void {
    _currentFiber = fiber;
    fiber.hookIndex = 0;
    fiber.onInput = undefined;
    fiber._nextChildIdx = 0;
    // Snapshot existing child fibers so renderComponent can look them up for reuse
    fiber._prevChildFibers = fiber.childFibers;
    fiber.childFibers = new Map();
}

/** Clear the current render context */
export function clearCurrentFiber(): void {
    _currentFiber = null;
}

/** Create a new Fiber for a component instance */
export function createFiber(parent?: Fiber): Fiber {
    return {
        id: _nextFiberId++,
        hooks: [],
        hookIndex: 0,
        isDirty: true,
        effects: [],
        layoutEffects: [],
        cleanups: [],
        intervals: [],
        contextValues: new Map(),
        parent,
    };
}

/** Set the requestRender callback (called by the renderer) */
export function setRequestRender(fn: (() => void) | null): void {
    _requestRender = fn;
}

/** Get the current requestRender callback */
export function getRequestRender(): (() => void) | null {
    return _requestRender;
}

/** Set the insertBefore callback for inline rendering */
export function setInsertBefore(fn: ((line: string) => (() => void) | void) | null): void {
    _insertBefore = fn;
}

// ── Batched State Updates ──

let _pendingUpdates = new Set<Fiber>();
let _flushScheduled = false;

// ── Global Cleanup Registry ──
// Used by singleton stores (NotificationStore, etc.) to register
// cleanup functions that are called during test teardown.

let _globalCleanups: Array<() => void> = [];

/**
 * Register a global cleanup function. Returns an unregister function.
 * Registered cleanups are called when resetHooksGlobals() is invoked.
 */
export function registerCleanup(fn: () => void): () => void {
    _globalCleanups.push(fn);
    return () => {
        const idx = _globalCleanups.indexOf(fn);
        if (idx >= 0) _globalCleanups.splice(idx, 1);
    };
}

/**
 * Schedule a re-render. Multiple setState calls within the same
 * microtask are batched into a single re-render cycle.
 */
function scheduleRender(fiber?: Fiber): void {
    if (fiber) {
        _pendingUpdates.add(fiber);
    }
    if (!_flushScheduled) {
        _flushScheduled = true;
        queueMicrotask(flushUpdates);
    }
}

/** Flush all pending state updates in a single render pass */
function flushUpdates(): void {
    _flushScheduled = false;
    _pendingUpdates.clear();
    _requestRender?.();
}

// ── Hooks ──

/**
 * useState — manage component state.
 *
 * ```tsx
 * const [count, setCount] = useState(0);
 * setCount(prev => prev + 1);
 * ```
 */
export function useState<T>(initialValue: T | (() => T)): [T, (newValue: T | ((prev: T) => T)) => void] {
    const fiber = currentFiber();
    const idx = fiber.hookIndex++;

    // Initialize on first render
    if (idx >= fiber.hooks.length) {
        const value = typeof initialValue === 'function'
            ? (initialValue as () => T)()
            : initialValue;
        fiber.hooks.push({ value });
    }

    const hookState = fiber.hooks[idx];

    const setState = (newValue: T | ((prev: T) => T)) => {
        const prev = hookState.value;
        const next = typeof newValue === 'function'
            ? (newValue as (prev: T) => T)(prev)
            : newValue;

        if (!Object.is(prev, next)) {
            hookState.value = next;
            fiber.isDirty = true;
            scheduleRender(fiber);
        }
    };

    return [hookState.value, setState];
}

/**
 * useEffect — run side effects after render.
 *
 * ```tsx
 * useEffect(() => {
 *     const sub = subscribe();
 *     return () => sub.unsubscribe(); // cleanup
 * }, [dep]);
 * ```
 */
export function useEffect(effect: () => void | (() => void), deps?: any[]): void {
    const fiber = currentFiber();
    const idx = fiber.hookIndex++;

    // Initialize or check deps
    if (idx >= fiber.hooks.length) {
        const record: EffectRecord = { effect, deps, ran: false };
        fiber.hooks.push({ value: record, deps });
        fiber.effects.push(record);
    } else {
        const prev = fiber.hooks[idx];
        const shouldRun = !deps || !prev.deps || deps.some((d, i) => !Object.is(d, prev.deps![i]));

        if (shouldRun) {
            prev.deps = deps;
            // Update the existing record in-place (avoids duplicates)
            const record = prev.value as EffectRecord;
            record.effect = effect;
            record.deps = deps;
            record.ran = false;
        }
    }
}

export function useLayoutEffect(effect: () => void | (() => void), deps?: any[]): void {
    const fiber = currentFiber();
    const idx = fiber.hookIndex++;

    // Initialize or check deps
    if (idx >= fiber.hooks.length) {
        const record: EffectRecord = { effect, deps, ran: false };
        fiber.hooks.push({ value: record, deps });
        fiber.layoutEffects.push(record);
        } else {
        const prev = fiber.hooks[idx];
        const shouldRun = !deps || !prev.deps || deps.some((d, i) => !Object.is(d, prev.deps![i]));

        if (shouldRun) {
            prev.deps = deps;
            // Update the existing record in-place (avoids duplicates)
            const record = prev.value as EffectRecord;
            record.effect = effect;
            record.deps = deps;
            record.ran = false;
        }
    }
}

/**
 * useInput — handle keyboard input in the component.
 *
 * ```tsx
 * useInput((key, event) => {
 *     if (key === 'q') process.exit(0);
 *     if (key === 'up') selectPrev();
 * });
 * ```
 */
export function useInput(handler: (key: string, event: KeyEvent) => void): void {
    const fiber = currentFiber();
    const prev = fiber.onInput;
    fiber.onInput = (event: KeyEvent) => {
        handler(event.key, event);
        prev?.(event);
    };
}

export interface KeyBinding {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    action: () => void;
    description?: string;
    category?: string;
}

/**
 * useKeymap — declarative keybindings with optional conflict detection.
 *
 * Mutually exclusive with useInput — only one per component.
 *
 * ```tsx
 * useKeymap([
 *     { key: 'q', action: () => process.exit(0), description: 'Quit' },
 *     { key: 'r', ctrl: true, action: refresh, description: 'Refresh' },
 * ]);
 * ```
 */
export function useKeymap(bindings: KeyBinding[]): void {
    const fiber = currentFiber();
    const idx = fiber.hookIndex++;

    if (idx >= fiber.hooks.length) {
        // Dev-mode conflict detection on first render
        if (process.env.NODE_ENV !== 'production') {
            const seen = new Map<string, KeyBinding>();
            for (const b of bindings) {
                const key = `${b.key}|${b.ctrl ?? false}|${b.alt ?? false}|${b.shift ?? false}`;
                if (seen.has(key)) {
                    console.warn(
                        `[useKeymap] Conflicting keybinding for key "${b.key}" ` +
                        `(ctrl=${b.ctrl ?? false}, alt=${b.alt ?? false}, shift=${b.shift ?? false})`
                    );
                }
                seen.set(key, b);
            }
        }
        fiber.hooks.push({ value: bindings });
    } else {
        fiber.hooks[idx].value = bindings;
    }

    fiber.onInput = (event: KeyEvent) => {
        const currentBindings: KeyBinding[] = fiber.hooks[idx].value;
        for (const b of currentBindings) {
            if (
                event.key === b.key &&
                (b.ctrl ?? false) === (event.ctrl ?? false) &&
                (b.alt ?? false) === (event.alt ?? false) &&
                (b.shift ?? false) === (event.shift ?? false)
            ) {
                b.action();
                return;
            }
        }
    };
}

/**
 * useInsertBefore — register a persistent line above the inline viewport.
 * The line is added when the component mounts and removed on unmount or when
 * the value changes.
 */
export function useInsertBefore(line: string): void {
    useEffect(() => {
        return _insertBefore?.(line) as (() => void) | void;
    }, [line]);
}

export interface MotionPreferences {
    /** True when the user prefers reduced motion (NO_MOTION=1 or CI=true) */
    reduced: boolean;
}

/**
 * useMotion — check if animations should be reduced.
 *
 * ```tsx
 * function AnimatedSpinner() {
 *     const { reduced } = useMotion();
 *     if (reduced) return <Text>[loading]</Text>;
 *     return <Spinner />;
 * }
 * ```
 */
export function useMotion(): MotionPreferences {
    // Validate we're inside a component — does NOT consume a hook slot
    currentFiber();
    return { reduced: !caps.motion };
}

/**
 * useInterval — call a function at regular intervals (auto-cleans up).
 *
 * ```tsx
 * useInterval(() => {
 *     setData(fetchData());
 * }, 1000);
 * ```
 */
export function useInterval(callback: () => void, delayMs: number): void {
    const fiber = currentFiber();
    const idx = fiber.hookIndex++;

    if (idx >= fiber.hooks.length) {
        // First render: subscribe to the shared pool with a mutable callback ref
        const callbackRef = { current: callback };
        const unsub = timerPoolSubscribe(delayMs, () => {
            callbackRef.current();
            scheduleRender(fiber);
        });
        fiber.hooks.push({ value: { unsub, callbackRef, delayMs } });
        // Register unsub in cleanups so destroyFiber unsubscribes automatically
        fiber.cleanups.push(unsub);
        // NOTE: do NOT push to fiber.intervals — unsub handles pool cleanup
    } else {
        // Re-render: update the callback ref to avoid stale closures
        const stored = fiber.hooks[idx].value;
        stored.callbackRef.current = callback;
        if (stored.delayMs !== delayMs) {
            // delayMs changed: unsub from old interval, subscribe at new rate
            const oldUnsub = stored.unsub;
            const newUnsub = timerPoolSubscribe(delayMs, () => {
                stored.callbackRef.current();
                scheduleRender(fiber);
            });
            stored.unsub = newUnsub;
            stored.delayMs = delayMs;
            // Replace old cleanup entry with new one
            const ci = fiber.cleanups.indexOf(oldUnsub);
            if (ci !== -1) fiber.cleanups[ci] = newUnsub;
            oldUnsub();
        }
    }
}

/**
 * useMemo — memoize expensive computations.
 *
 * ```tsx
 * const sorted = useMemo(() => items.sort(), [items]);
 * ```
 */
export function useMemo<T>(factory: () => T, deps: any[]): T {
    const fiber = currentFiber();
    const idx = fiber.hookIndex++;

    if (idx >= fiber.hooks.length) {
        const value = factory();
        fiber.hooks.push({ value, deps });
        return value;
    }

    const prev = fiber.hooks[idx];
    const changed = !prev.deps || deps.some((d, i) => !Object.is(d, prev.deps![i]));

    if (changed) {
        prev.value = factory();
        prev.deps = deps;
    }

    return prev.value;
}

/**
 * useRef — mutable ref that persists across renders.
 *
 * ```tsx
 * const inputRef = useRef('');
 * inputRef.current = 'hello';
 * ```
 */
export function useRef<T>(initialValue: T): { current: T } {
    const fiber = currentFiber();
    const idx = fiber.hookIndex++;

    if (idx >= fiber.hooks.length) {
        fiber.hooks.push({ value: { current: initialValue } });
    }

    return fiber.hooks[idx].value;
}

/**
 * useImperativeHandle — expose an imperative handle through a ref.
 *
 * ```tsx
 * useImperativeHandle(ref, () => ({ focus: () => input.focus() }), []);
 * ```
 */
export function useImperativeHandle<T>(
    ref: { current: T | null } | null | undefined,
    createHandle: () => T,
    deps: any[],
): void {
    const handle = useMemo(createHandle, deps);

    if (ref) {
        ref.current = handle;
    }
}

/**
 * useCallback — memoize a callback function.
 */
export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T {
    return useMemo(() => callback, deps);
}

/**
 * useReducer — manage state with a reducer function.
 *
 * ```tsx
 * const [state, dispatch] = useReducer((state, action) => {
 *     if (action === 'inc') return state + 1;
 *     if (action === 'dec') return state - 1;
 *     return state;
 * }, 0);
 * dispatch('inc');
 * ```
 */
export function useReducer<S, A>(
    reducer: (state: S, action: A) => S,
    initialState: S,
): [S, (action: A) => void] {
    const fiber = currentFiber();
    const idx = fiber.hookIndex++;

    if (idx >= fiber.hooks.length) {
        fiber.hooks.push({ value: initialState });
    }

    const hookState = fiber.hooks[idx];

    const dispatch = (action: A): void => {
        const next = reducer(hookState.value, action);
        if (!Object.is(hookState.value, next)) {
            hookState.value = next;
            fiber.isDirty = true;
            scheduleRender(fiber);
        }
    };

    return [hookState.value, dispatch];
}

/** Run all pending effects for a fiber */
export function runEffects(fiber: Fiber): void {
    for (const record of fiber.effects) {
        if (!record.ran) {
            // Run cleanup from previous effect
            record.cleanup?.();
            const cleanup = record.effect();
            if (typeof cleanup === 'function') {
                record.cleanup = cleanup;
            }
            record.ran = true;
        }
    }
}

export function runLayoutEffects(fiber: Fiber): void {
    for (const record of fiber.layoutEffects) {
        if (!record.ran) {
            // Run cleanup from previous effect
            record.cleanup?.();
            const cleanup = record.effect();
            if (typeof cleanup === 'function') {
                record.cleanup = cleanup;
            }
            record.ran = true;
        }
    }
}


/** Clean up all effects and intervals for a fiber, including child fibers */
export function destroyFiber(fiber: Fiber): void {
    for (const record of fiber.effects) {
        record.cleanup?.();
    }
    for (const record of fiber.layoutEffects) {
        record.cleanup?.();
    }
    for (const cleanup of fiber.cleanups) {
        cleanup();
    }
    for (const timer of fiber.intervals) {
        clearInterval(timer);
    }
    // Recursively destroy child fibers
    if (fiber.childFibers) {
        for (const entry of fiber.childFibers.values()) {
            destroyFiber(entry.fiber);
        }
    }
    if (fiber._prevChildFibers) {
        for (const entry of fiber._prevChildFibers.values()) {
            destroyFiber(entry.fiber);
        }
    }
    // Clean up global _instanceMap entries pointing to this fiber
    const termuiInstances: Map<any, any> | undefined = (globalThis as any).__termuijs_instances;
    if (termuiInstances instanceof Map) {
        for (const [widget, inst] of termuiInstances) {
            if (inst.fiber === fiber) {
                termuiInstances.delete(widget);
            }
        }
    }
    fiber.hooks = [];
    fiber.effects = [];
    fiber.layoutEffects = [];
    fiber.cleanups = [];
    fiber.intervals = [];
    fiber.contextValues.clear();
    fiber.childFibers = undefined;
    fiber._prevChildFibers = undefined;
}

/** Reset all module-level globals for test isolation */
export function resetHooksGlobals(): void {
    _currentFiber = null;
    _requestRender = null;
    _insertBefore = null;
    _pendingUpdates.clear();
    _flushScheduled = false;
    // Run all registered global cleanups (singleton stores, etc.)
    const cleanups = _globalCleanups;
    _globalCleanups = [];
    for (const fn of cleanups) {
        try { fn(); } catch { /* ignore cleanup errors */ }
    }
}

/**
 * Traverse the fiber tree collecting all onInput handlers.
 * Used by render() to dispatch key events to all active keymaps.
 */
export function collectInputHandlers(fiber: Fiber): Array<(event: KeyEvent) => void> {
    const handlers: Array<(event: KeyEvent) => void> = [];
    if (fiber.onInput) handlers.push(fiber.onInput);
    if (fiber.childFibers) {
        for (const entry of fiber.childFibers.values()) {
            const nested = collectInputHandlers(entry.fiber);
            for (const h of nested) handlers.push(h);
        }
    }
    return handlers;
}

// ── Async Data Hook ──

/**
 * State shape returned by useAsync.
 */
export interface AsyncState<T> {
    /** Resolved data (null while loading or on error) */
    data: T | null;
    /** True while the async function is executing */
    loading: boolean;
    /** Error object if the async function threw */
    error: Error | null;
    /** Call this to re-execute the async function */
    refetch: () => void;
}

/**
 * useAsync — load async data with automatic loading/error states.
 *
 * ```tsx
 * function UserList() {
 *     const { data, loading, error } = useAsync(() => fetchUsers(), []);
 *     if (loading) return <Text>Loading...</Text>;
 *     if (error) return <Text color="red">Error: {error.message}</Text>;
 *     return <Table rows={data} columns={['name', 'email']} />;
 * }
 * ```
 */
export function useAsync<T>(
    asyncFn: () => Promise<T>,
    deps: any[] = [],
): AsyncState<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Track a version counter to ignore stale responses
    const versionRef = useRef(0);

    const refetch = useCallback(() => {
        const version = ++versionRef.current;
        setLoading(true);
        setError(null);

        asyncFn()
            .then((result) => {
                // Only update if this is still the latest request
                if (versionRef.current === version) {
                    setData(result);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (versionRef.current === version) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setLoading(false);
                }
            });
    }, deps);

    useEffect(() => {
        refetch();
    }, deps);

    return { data, loading, error, refetch };
}

