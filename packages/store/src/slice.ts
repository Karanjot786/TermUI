// ─────────────────────────────────────────────────────
// @termuijs/store — Slicing & Module System
// ─────────────────────────────────────────────────────

import { createStore, type StoreOptions, type SetState, type GetState, type UseStore, type Store } from './store.js';

export type SliceDefinition<T, TGlobal, IsLazy extends boolean = boolean> = {
    name: string;
    creator: (set: SetState<T>, get: GetState<T>, globalSet: SetState<TGlobal>, globalGet: GetState<TGlobal>) => T;
    options?: StoreOptions<T>;
    isLazy?: IsLazy;
    load?: () => Promise<SliceDefinition<T, TGlobal, any> | { default: SliceDefinition<T, TGlobal, any> }>;
};

/**
 * Define a feature slice with its own state and isolated middlewares.
 */
export function createSlice<T, TGlobal = any>(
    name: string,
    creator: (set: SetState<T>, get: GetState<T>, globalSet: SetState<TGlobal>, globalGet: GetState<TGlobal>) => T,
    options?: StoreOptions<T>
): SliceDefinition<T, TGlobal, false> {
    return { name, creator, options, isLazy: false };
}

/**
 * Register a lazy slice that will be dynamically loaded via `loadLazySlice()`.
 */
export function createLazySlice<T, TGlobal = any>(
    name: string,
    load: () => Promise<SliceDefinition<T, TGlobal, any> | { default: SliceDefinition<T, TGlobal, any> }>
): SliceDefinition<T, TGlobal, true> {
    return { name, creator: (() => ({})) as any, isLazy: true, load };
}

export type StateFromSlice<S> = S extends SliceDefinition<infer T, any, any> ? T : never;

// Convert tuple of slices to an object map
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type SlicesToGlobalState<Slices extends ReadonlyArray<SliceDefinition<any, any, any>>> = UnionToIntersection<{
    [K in keyof Slices]: Slices[K] extends SliceDefinition<infer T, any, infer IsLazy>
        ? { [P in Slices[K]['name']]: IsLazy extends true ? T | undefined : T }
        : never
}[number]> & object;

export type CombinedUseStore<TGlobal> = UseStore<TGlobal> & {
    loadLazySlice: (name: string) => Promise<void>;
};

/**
 * Combine multiple slices into a single unified global store.
 * Updates routed to slice keys trigger their independent middlewares.
 */
export function combineSlices<Slices extends SliceDefinition<any, any, any>[]>(
    ...slices: Slices
): CombinedUseStore<SlicesToGlobalState<Slices>> {
    type TGlobal = SlicesToGlobalState<Slices>;

    const sliceStores = new Map<string, Store<any>>();
    const lazySlices = new Map<string, () => Promise<SliceDefinition<any, any, any> | { default: SliceDefinition<any, any, any> }>>();
    const inFlightLoads = new Map<string, Promise<void>>();

    // Wrapped globals to expose to slice creators
    let globalStore: Store<TGlobal> | null = null;
    const globalSet: SetState<TGlobal> = (...args) => {
        if (!globalStore) throw new Error('Global store not initialized yet');
        return globalStore.setState(...args);
    };
    const globalGet: GetState<TGlobal> = () => {
        if (!globalStore) throw new Error('Global store not initialized yet');
        return globalStore.getState();
    };

    function initSliceStore(slice: SliceDefinition<any, any, any>) {
        const store = createStore((set, get) => {
            return slice.creator(set, get, globalSet, globalGet);
        }, slice.options);

        sliceStores.set(slice.name, store);
        return store;
    }

    const initialGlobalState = {} as TGlobal;

    // Initialize eager slices first to build the correct initialGlobalState
    for (const slice of slices) {
        if (slice.isLazy && slice.load) {
            lazySlices.set(slice.name, slice.load);
            (initialGlobalState as any)[slice.name] = undefined;
        } else {
            const store = initSliceStore(slice);
            (initialGlobalState as any)[slice.name] = store.getState();
        }
    }

    globalStore = createStore<TGlobal>(() => initialGlobalState);
    const originalGlobalSet = globalStore.setState;

    // Sync on slice changes for initialized slices
    for (const [name, store] of sliceStores.entries()) {
        store.subscribe((state) => {
            originalGlobalSet({ [name]: state } as unknown as Partial<TGlobal>);
        });
    }

    // Intercept global setState to route partial updates into individual slices
    globalStore.setState = (partial: Partial<TGlobal> | ((s: TGlobal) => Partial<TGlobal>)) => {
        const p = typeof partial === 'function' ? partial(globalStore.getState()) : partial;
        
        let hasGlobalChanges = false;
        const globalPartial = {} as Partial<TGlobal>;

        for (const key of Object.keys(p)) {
            if (sliceStores.has(key)) {
                const sliceStore = sliceStores.get(key)!;
                sliceStore.setState((p as any)[key]);
            } else {
                hasGlobalChanges = true;
                (globalPartial as any)[key] = (p as any)[key];
            }
        }

        if (hasGlobalChanges) {
            originalGlobalSet(globalPartial);
        }
        
        return undefined as any; // setState returns void in the old store
    };

    // Override reset to handle eager vs lazy slice stores correctly
    const originalReset = globalStore.reset;
    globalStore.reset = () => {
        for (const [name, store] of Array.from(sliceStores.entries())) {
            const isLazy = lazySlices.has(name);
            if (isLazy) {
                store.destroy();
                sliceStores.delete(name);
            } else {
                store.reset();
            }
        }
        originalReset();
    };

    const loadLazySlice = (name: string): Promise<void> => {
        if (sliceStores.has(name)) return Promise.resolve();
        if (!lazySlices.has(name)) return Promise.reject(new Error(`No lazy slice registered for ${name}`));
        
        if (inFlightLoads.has(name)) {
            return inFlightLoads.get(name)!;
        }

        const promise = (async () => {
            const loader = lazySlices.get(name)!;
            const result = await loader();
            const sliceDef = ('default' in result && result.default)
                ? result.default
                : (result as SliceDefinition<any, any, any>);
            
            if (sliceDef.name !== name) {
                throw new Error(`Lazy slice name mismatch: expected ${name}, got ${sliceDef.name}`);
            }
            
            if (!sliceStores.has(name)) {
                const store = initSliceStore(sliceDef);
                
                // Sync initial state immediately
                originalGlobalSet({ [name]: store.getState() } as unknown as Partial<TGlobal>);

                // Sync on slice changes
                store.subscribe((state) => {
                    originalGlobalSet({ [name]: state } as unknown as Partial<TGlobal>);
                });
            }
            inFlightLoads.delete(name);
        })();

        inFlightLoads.set(name, promise);
        return promise;
    };

    const useStore = globalStore as CombinedUseStore<TGlobal>;
    useStore.loadLazySlice = loadLazySlice;

    return useStore;
}
