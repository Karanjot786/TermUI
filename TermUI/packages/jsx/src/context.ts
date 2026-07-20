// ─────────────────────────────────────────────────────
// @termuijs/jsx — Context API
//
// React-style context for sharing state down the
// component tree without prop drilling.
//
// Usage:
//   const ThemeCtx = createContext(defaultTheme);
//
//   function App() {
//       return (
//           <ThemeCtx.Provider value={darkTheme}>
//               <Dashboard />
//           </ThemeCtx.Provider>
//       );
//   }
//
//   function StatusBar() {
//       const theme = useContext(ThemeCtx);
//   }
// ─────────────────────────────────────────────────────

import { currentFiber, type Fiber } from './hooks.js';
import type { VNode, FC } from './vnode.js';

// ── Context ──

/**
 * A Context object created by `createContext()`.
 * Contains a Provider component and the default value.
 */
export interface Context<T> {
    /** Internal symbol — used to look up the value in the fiber tree */
    readonly _id: symbol;
    /** Provider component — wrap your tree to supply a value */
    readonly Provider: FC<{ value: T; children?: VNode | VNode[] }>;
    /** The default value returned when no Provider is found */
    readonly defaultValue: T;
}

/**
 * Create a new context with a default value.
 *
 * ```tsx
 * const ThemeContext = createContext({ bg: 'black', fg: 'white' });
 * ```
 */
export function createContext<T>(defaultValue: T): Context<T> {
    const id = Symbol('context');

    // The Provider is a functional component that stores
    // the value on the current fiber's contextValues map.
    // It renders its children transparently.
    const Provider: FC<{ value: T; children?: VNode | VNode[] }> = ({ value, children }) => {
        const fiber = currentFiber();
        fiber.contextValues.set(id, value);

        // Return children as-is (single child or fragment)
        if (Array.isArray(children)) {
            return { type: Symbol.for('termui.fragment'), children } as any;
        }
        return (children ?? null) as VNode;
    };

    // Tag the Provider so reconciler knows it's special
    (Provider as any).displayName = 'Context.Provider';

    return Object.freeze({ _id: id, Provider, defaultValue });
}

/**
 * Consume a context value from the nearest Provider ancestor.
 * If no Provider is found, returns the default value.
 *
 * ```tsx
 * function StatusBar() {
 *     const theme = useContext(ThemeContext);
 *     return <Text color={theme.fg}>{theme.label}</Text>;
 * }
 * ```
 */
export function useContext<T>(context: Context<T>): T {
    const fiber = currentFiber();

    // Walk up the fiber tree to find the nearest Provider
    let current: Fiber | undefined = fiber;
    while (current) {
        if (current.contextValues.has(context._id)) {
            return current.contextValues.get(context._id) as T;
        }
        current = current.parent;
    }

    // No Provider found — return default
    return context.defaultValue;
}
