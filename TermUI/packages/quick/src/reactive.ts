// ─────────────────────────────────────────────────────
// @termuijs/quick — Reactive data binding
// ─────────────────────────────────────────────────────

/**
 * A reactive value — either a static value or a function that returns one.
 * Functions are re-evaluated on each refresh tick.
 */
export type Reactive<T> = T | (() => T);

/**
 * Resolve a reactive value — calls the function if it is one,
 * otherwise returns the static value.
 */
export function resolve<T>(value: Reactive<T>): T {
    return typeof value === 'function' ? (value as () => T)() : value;
}

/**
 * Check if a value is a reactive function.
 */
export function isReactive<T>(value: Reactive<T>): value is () => T {
    return typeof value === 'function';
}
