import type { Store } from './store.js';
 
export interface StoreSnapshot<T> {
    id: number;
    label?: string;
    state: T;
}
  
export interface SnapshotHistoryOptions {
    limit?: number;
}
 
export interface StoreSnapshotHistory<T extends object> {
    capture(label?: string): StoreSnapshot<T>;
    restore(id: number): StoreSnapshot<T>;
    undo(): StoreSnapshot<T> | null;
    redo(): StoreSnapshot<T> | null;
    list(): StoreSnapshot<T>[];
    clear(): void;
}
 
// Deep-clone while stripping function values at every level — action
// methods (set()-bound closures) live directly on store state and are not
// structured-cloneable. This mirrors store.ts's own safeDeepClone, which
// exists for the same reason.
function cloneState<T>(state: T): T {
    const strip = (value: unknown): unknown => {
        if (value === null || typeof value !== 'object') return value;
        if (value instanceof Date || value instanceof RegExp) return value;
        if (Array.isArray(value)) return value.map(strip);
        if (value instanceof Map) {
            const m = new Map();
            for (const [k, v] of value) m.set(k, strip(v));
            return m;
        }
        if (value instanceof Set) {
            const s = new Set();
            for (const v of value) s.add(strip(v));
            return s;
        }
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (typeof v === 'function') continue;
            out[k] = strip(v);
        }
        return out;
    };
 
    const stripped = strip(state);
    return typeof structuredClone === 'function'
        ? structuredClone(stripped as T)
        : (JSON.parse(JSON.stringify(stripped)) as T);
}
 
export function createSnapshotHistory<T extends object>(
    store: Store<T>,
    options: SnapshotHistoryOptions = {},
): StoreSnapshotHistory<T> {
    const limit = options.limit ?? 50;
    const snapshots: StoreSnapshot<T>[] = [];
    let cursor = -1;
    let nextId = 1;
 
    const apply = (snapshot: StoreSnapshot<T>): StoreSnapshot<T> => {
        const before = cloneState(store.getState());
        try {
            store.setState(cloneState(snapshot.state) as Partial<T>);
        } catch (error) {
            store.setState(before as Partial<T>);
            throw error;
        }
        return { ...snapshot, state: cloneState(snapshot.state) };
    };
 
    return {
        capture(label) {
            snapshots.splice(cursor + 1);
            const snapshot = { id: nextId++, label, state: cloneState(store.getState()) };
            snapshots.push(snapshot);
            while (snapshots.length > limit) {
                snapshots.shift();
            }
            cursor = snapshots.length - 1;
            return { ...snapshot, state: cloneState(snapshot.state) };
        },
        restore(id) {
            const index = snapshots.findIndex(snapshot => snapshot.id === id);
            if (index === -1) throw new Error(`Unknown store snapshot: ${id}`);
            const result = apply(snapshots[index]);
            // Only advance the cursor once the state change actually succeeded —
            // otherwise a thrown setState leaves cursor out of sync with live state.
            cursor = index;
            return result;
        },
        undo() {
            if (cursor <= 0) return null;
            const targetIndex = cursor - 1;
            const result = apply(snapshots[targetIndex]);
            cursor = targetIndex;
            return result;
        },
        redo() {
            if (cursor >= snapshots.length - 1) return null;
            const targetIndex = cursor + 1;
            const result = apply(snapshots[targetIndex]);
            cursor = targetIndex;
            return result;
        },
        list() {
            return snapshots.map(snapshot => ({ ...snapshot, state: cloneState(snapshot.state) }));
        },
        clear() {
            snapshots.splice(0);
            cursor = -1;
        },
    };
}
 
