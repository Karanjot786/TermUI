// ─────────────────────────────────────────────────────
// Signal and Mutate helpers
// ─────────────────────────────────────────────────────

type Listener<T> = (value: T) => void;

export interface Signal<T> {
    /** The current value of the signal */
    value: T;
    /** Subscribe to changes */
    subscribe: (listener: Listener<T>) => () => void;
    /** Internal method to forcefully trigger a re-render/update */
    _setDirty: () => void;
}

/**
 * Creates a reactive signal.
 */
export function signal<T>(initialValue: T): Signal<T> {
    let _value = initialValue;
    const listeners = new Set<Listener<T>>();

    return {
        get value() {
            return _value;
        },
        set value(newVal: T) {
            if (!Object.is(_value, newVal)) {
                _value = newVal;
                listeners.forEach((l) => l(_value));
            }
        },
        subscribe(listener: Listener<T>) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        _setDirty() {
            listeners.forEach((l) => l(_value));
        }
    };
}

/**
 * Forces a re-render for a signal, even if its internal reference hasn't changed.
 * Useful for in-place mutations like array.push() or object property updates.
 *
 * @param sig The signal to mutate
 */
export function mutate<T>(sig: Signal<T>): void {
    sig._setDirty();
}
