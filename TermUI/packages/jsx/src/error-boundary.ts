// ─────────────────────────────────────────────────────
// @termuijs/jsx — ErrorBoundary
//
// A marker component that the reconciler uses to
// catch render errors in descendant components and
// render a fallback UI instead of crashing.
// ─────────────────────────────────────────────────────

import type { VNode, FC } from './vnode.js';
import { Fragment } from './vnode.js';

export interface ErrorBoundaryProps {
    fallback?: (error: Error) => VNode;
    onError?: (error: Error) => void;
    children?: VNode | VNode[];
}

export const ErrorBoundary: FC<ErrorBoundaryProps> = (props) => {
    // This is a marker component — the reconciler handles the actual boundary logic.
    // When this component's children throw, the reconciler catches and calls errorFallback.
    // This function itself just renders children normally.
    const children = Array.isArray(props.children)
        ? props.children
        : props.children
        ? [props.children]
        : [];
    if (children.length === 0) return null as any;
    if (children.length === 1) return children[0] as any;
    // Wrap multiple children in a Fragment so the reconciler handles them correctly
    return { type: Fragment, children } as any;
};
