// ─────────────────────────────────────────────────────
// @termuijs/jsx — ErrorBoundary
//
// A marker component that the reconciler uses to
// catch render errors in descendant components and
// render a fallback UI instead of crashing.
// Also catches widget render-layer errors through
// the _renderError tracking on widgets.
// ─────────────────────────────────────────────────────

import type { VNode, FC } from './vnode.js';
import { Fragment } from './vnode.js';
import { Widget } from '@termuijs/widgets';

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

/**
 * Check if a widget (or any descendant) has a render error.
 * Used by ErrorBoundary-aware code to detect widget-layer failures.
 */
export function hasWidgetRenderError(widget: Widget): Error | null {
    if ((widget as any)._renderError) {
        return (widget as any)._renderError;
    }
    const children: Widget[] = (widget as any)._children ?? [];
    for (const child of children) {
        const err = hasWidgetRenderError(child);
        if (err) return err;
    }
    return null;
}
