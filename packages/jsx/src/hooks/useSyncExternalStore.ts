// ─────────────────────────────────────────────────────
// @termuijs/jsx — useSyncExternalStore hook
//
// A React-compatible hook that subscribes to external stores
// using the subscribe/getSnapshot pattern.
// ─────────────────────────────────────────────────────

import { useState, useEffect, useRef } from '../hooks.js';

/**
 * useSyncExternalStore — subscribe to an external store.
 *
 * ```tsx
 * const state = useSyncExternalStore(
 *     (onStoreChange) => store.subscribe(onStoreChange),
 *     () => store.getSnapshot()
 * );
 * ```
 */
export function useSyncExternalStore<T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T
): T {
    // 1. Get the current snapshot
    const snapshot = getSnapshot();

    // 2. State trigger to force a re-render
    const [, forceUpdate] = useState({});

    // 3. Keep latest refs to prevent stale closure capturing
    const getSnapshotRef = useRef(getSnapshot);
    const lastValueRef = useRef(snapshot);

    getSnapshotRef.current = getSnapshot;
    lastValueRef.current = snapshot;

    // 4. Set up effect to subscribe to store changes
    useEffect(() => {
        const handleStoreChange = () => {
            const latestSnapshot = getSnapshotRef.current();
            if (!Object.is(lastValueRef.current, latestSnapshot)) {
                forceUpdate({});
            }
        };

        const unsubscribe = subscribe(handleStoreChange);
        return () => {
            unsubscribe();
        };
    }, [subscribe]);

    return snapshot;
}
