// ─────────────────────────────────────────────────────
// @termuijs/jsx — JSX Factory
//
// This is the `h()` function invoked by the JSX
// transform. It creates VElement nodes.
//
// Usage in tsconfig.json:
//   "jsx": "react-jsx",
//   "jsxImportSource": "@termuijs/jsx"
// ─────────────────────────────────────────────────────

import type { VNode, VElement, FC } from './vnode.js';
import { Fragment, flattenChildren } from './vnode.js';

/**
 * Create a virtual element. This is the `h()` / `createElement()`.
 *
 * Called by the TypeScript JSX transform automatically:
 *   <Box gap={1}>hello</Box>
 * becomes:
 *   jsx('Box', { gap: 1, children: 'hello' })
 */
export function createElement(
    type: string | FC<any> | typeof Fragment,
    props: Record<string, any> | null,
    ...children: any[]
): VNode {
    const resolvedProps = { ...(props ?? {}) };
    const key = resolvedProps.key;
    delete resolvedProps.key;

    const flatChildren = flattenChildren(children);

    if (type === Fragment) {
        return { type: Fragment, children: flatChildren };
    }

    return {
        type,
        props: resolvedProps,
        children: flatChildren,
        key,
    } as VElement;
}

// ── JSX Runtime (automatic transform) ──

/**
 * jsx() — called by the automatic JSX transform for elements without a spread key.
 */
export function jsx(
    type: string | FC<any> | typeof Fragment,
    props: Record<string, any>,
    key?: string | number,
): VNode {
    const { children, ...rest } = props;
    const flatChildren = children != null
        ? Array.isArray(children) ? flattenChildren(children) : flattenChildren([children])
        : [];

    if (type === Fragment) {
        return { type: Fragment, children: flatChildren };
    }

    return {
        type,
        props: rest,
        children: flatChildren,
        key,
    } as VElement;
}

/**
 * jsxs() — called by automatic transform when there are multiple static children.
 */
export const jsxs = jsx;
