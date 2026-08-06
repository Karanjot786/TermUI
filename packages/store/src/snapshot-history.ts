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

export function createSnapshotHistory<T extends object>(
    store: Store<T>,
    options: SnapshotHistoryOptions = {},
): StoreSnapshotHistory<T> {
    const limit = options.limit ?? 50;
    const snapshots: StoreSnapshot<T>[] = [];
    let cursor = -1;
    let nextId = 1;

    const clone = (state: T): T => {
        if (typeof structuredClone === 'function') return structuredClone(state);
        return JSON.parse(JSON.stringify(state)) as T;
    };

    const apply = (snapshot: StoreSnapshot<T>): StoreSnapshot<T> => {
        const before = clone(store.getState());
        try {
            store.setState(clone(snapshot.state) as Partial<T>);
        } catch (error) {
            store.setState(before as Partial<T>);
            throw error;
        }
        return { ...snapshot, state: clone(snapshot.state) };
    };

    return {
        capture(label) {
            snapshots.splice(cursor + 1);
            const snapshot = { id: nextId++, label, state: clone(store.getState()) };
            snapshots.push(snapshot);
            while (snapshots.length > limit) {
                snapshots.shift();
            }
            cursor = snapshots.length - 1;
            return { ...snapshot, state: clone(snapshot.state) };
        },
        restore(id) {
            const index = snapshots.findIndex(snapshot => snapshot.id === id);
            if (index === -1) throw new Error(`Unknown store snapshot: ${id}`);
            cursor = index;
            return apply(snapshots[index]);
        },
        undo() {
            if (cursor <= 0) return null;
            cursor--;
            return apply(snapshots[cursor]);
        },
        redo() {
            if (cursor >= snapshots.length - 1) return null;
            cursor++;
            return apply(snapshots[cursor]);
        },
        list() {
            return snapshots.map(snapshot => ({ ...snapshot, state: clone(snapshot.state) }));
        },
        clear() {
            snapshots.splice(0);
            cursor = -1;
        },
    };
}
