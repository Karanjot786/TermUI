// ─────────────────────────────────────────────────────
// @termuijs/store — Slicing & Module System
// ─────────────────────────────────────────────────────

import { createStore, type StoreOptions, type SetState, type GetState, type UseStore, type Store } from './store.js';

export type SliceDefinition<T, TGlobal> = {
    name: string;
    creator: (set: SetState<T>, get: GetState<T>, globalSet: SetState<TGlobal>, globalGet: GetState<TGlobal>) => T;
    options?: StoreOptions<T>;
    isLazy?: boolean;
    load?: () => Promise<{ default: SliceDefinition<T, TGlobal> }>;
};

/**
 * Define a feature slice with its own state and isolated middlewares.
 */
export function createSlice<T, TGlobal = any>(
    name: string,
    creator: (set: SetState<T>, get: GetState<T>, globalSet: SetState<TGlobal>, globalGet: GetState<TGlobal>) => T,
    options?: StoreOptions<T>
): SliceDefinition<T, TGlobal> {
    return { name, creator, options };
}

/**
 * Register a lazy slice that will be dynamically loaded via `loadLazySlice()`.
 */
export function createLazySlice<T, TGlobal = any>(
    name: string,
    load: () => Promise<{ default: SliceDefinition<T, TGlobal> }>
): SliceDefinition<T, TGlobal> {
    return { name, creator: (() => ({})) as any, isLazy: true, load };
}

export type StateFromSlice<S> = S extends SliceDefinition<infer T, any> ? T : never;

// Convert tuple of slices to an object map
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type SlicesToGlobalState<Slices extends ReadonlyArray<SliceDefinition<any, any>>> = UnionToIntersection<{
    [K in keyof Slices]: Slices[K] extends SliceDefinition<any, any> ? { [P in Slices[K]['name']]: StateFromSlice<Slices[K]> } : never
}[number]> & object;

export type CombinedUseStore<TGlobal> = UseStore<TGlobal> & {
    loadLazySlice: (name: string) => Promise<void>;
};

/**
 * Combine multiple slices into a single unified global store.
 * Updates routed to slice keys trigger their independent middlewares.
 */
export function combineSlices<Slices extends SliceDefinition<any, any>[]>(
    ...slices: Slices
): CombinedUseStore<SlicesToGlobalState<Slices>> {
    type TGlobal = SlicesToGlobalState<Slices>;

    const sliceStores = new Map<string, Store<any>>();
    const lazySlices = new Map<string, () => Promise<{ default: SliceDefinition<any, any> }>>();
    
    const initialGlobalState = {} as TGlobal;

    for (const slice of slices) {
        if (slice.isLazy && slice.load) {
            lazySlices.set(slice.name, slice.load);
            (initialGlobalState as any)[slice.name] = undefined;
        } else {
            (initialGlobalState as any)[slice.name] = undefined;
        }
    }

    const globalStore = createStore<TGlobal>(() => initialGlobalState);
    const originalGlobalSet = globalStore.setState;
    
    // Wrapped globals to expose to slice creators
    const globalSet: SetState<TGlobal> = (...args) => globalStore.setState(...args);
    const globalGet: GetState<TGlobal> = () => globalStore.getState();

    function initSliceStore(slice: SliceDefinition<any, any>) {
        const store = createStore((set, get) => {
            return slice.creator(set, get, globalSet, globalGet);
        }, slice.options);

        sliceStores.set(slice.name, store);

        // Sync initial state immediately
        originalGlobalSet({ [slice.name]: store.getState() } as unknown as Partial<TGlobal>);

        // Sync on slice changes
        store.subscribe((state) => {
            originalGlobalSet({ [slice.name]: state } as unknown as Partial<TGlobal>);
        });
    }

    for (const slice of slices) {
        if (!slice.isLazy) {
            initSliceStore(slice);
        }
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

    const loadLazySlice = async (name: string) => {
        if (sliceStores.has(name)) return;
        if (!lazySlices.has(name)) throw new Error(`No lazy slice registered for ${name}`);
        
        const loader = lazySlices.get(name)!;
        const module = await loader();
        const sliceDef = module.default;
        
        if (sliceDef.name !== name) {
            throw new Error(`Lazy slice name mismatch: expected ${name}, got ${sliceDef.name}`);
        }
        
        initSliceStore(sliceDef);
    };

    const useStore = globalStore as CombinedUseStore<TGlobal>;
    useStore.loadLazySlice = loadLazySlice;

    return useStore;
}
