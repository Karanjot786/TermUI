// ─────────────────────────────────────────────────────
// @termuijs/jsx — memo()
//
// Wraps a functional component to skip re-rendering
// when props haven't changed (shallow comparison).
//
// Usage:
//   const MemoizedWidget = memo(ExpensiveWidget);
//   // or with custom comparison:
//   const MemoizedWidget = memo(ExpensiveWidget, (prev, next) =>
//       prev.id === next.id && prev.label === next.label
//   );
// ─────────────────────────────────────────────────────

import type { FC, VNode } from './vnode.js';
import type { Widget } from '@termuijs/widgets';

/**
 * Shallow comparison of two objects.
 * Returns true if all own enumerable keys have the same values.
 */
function shallowEqual(a: Record<string, any>, b: Record<string, any>): boolean {
    if (a === b) return true;
    if (!a || !b) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
            return false;
        }
    }

    return true;
}

/**
 * Memoize a functional component. The component will only
 * re-render when its props change (by shallow comparison).
 *
 * ```tsx
 * const MemoizedCounter = memo(Counter);
 *
 * // With custom comparison function:
 * const MemoizedItem = memo(Item, (prev, next) => prev.id === next.id);
 * ```
 *
 * @param component The functional component to memoize
 * @param areEqual Optional custom comparison function (return true to skip re-render)
 */
export function memo<P extends Record<string, any>>(
    component: FC<P>,
    areEqual?: (prevProps: P, nextProps: P) => boolean,
): FC<P> {
    const compare = areEqual ?? shallowEqual;

    // Cache the previous props and VNode output
    let prevProps: P | null = null;
    let prevResult: VNode | Widget | null = null;

    const memoized: FC<P> = (props: P & { children?: VNode | VNode[] }) => {
        // On first render, or when props change — call the component
        if (prevProps === null || !compare(prevProps, props as P)) {
            prevProps = { ...props } as P;
            prevResult = component(props);
        }

        return prevResult!;
    };

    // Tag for debugging
    (memoized as any).displayName = `memo(${(component as any).displayName || component.name || 'Component'})`;
    (memoized as any)._isMemo = true;

    return memoized;
}

/** Exported for testing */
export { shallowEqual };
