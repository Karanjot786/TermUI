// ─────────────────────────────────────────────────────
// @termuijs/jsx — createPortal
// ─────────────────────────────────────────────────────

import type { Widget } from '@termuijs/widgets';
import type { VNode } from './vnode.js';
import { createElement as h } from './createElement.js';
import { useLayoutEffect, currentFiber } from './hooks.js';
import { reconcile } from './reconciler.js';

interface PortalProps {
    target: Widget;
    children: VNode[];
}

function PortalComponent({ target, children }: PortalProps): VNode {
    const fiber = currentFiber();
    const childArray = Array.isArray(children) ? children : (children != null ? [children] : []);

    // Reconcile portal children during the render phase while the fiber context
    // (_currentFiber / _parentFiber) is still active. This ensures correct fiber
    // parent references, context propagation, and proper cleanup registration.
    const childWidgets = childArray.map((child: VNode) => reconcile(child, target));

    // Register portal children on the fiber so destroyFiber can clean them up
    fiber.portalChildren = [{ widgets: childWidgets, target }];

    // Use useLayoutEffect only for DOM-like side effects (adding/removing from target).
    // The cleanup function from the previous render cycle removes old widgets before
    // the new effect adds the new ones, matching React's effect lifecycle semantics.
    useLayoutEffect(() => {
        for (const widget of childWidgets) {
            target.addChild(widget);
        }

        return () => {
            for (const widget of childWidgets) {
                target.removeChild(widget);
            }
        };
    });

    // Return an empty, invisible box as a placeholder in the inline tree
    return h('box', { width: 0, height: 0 });
}

/**
 * Renders a subtree at a different point in the render order,
 * above the normal tree (inside the `target` Widget).
 * 
 * @param children The children to render in the portal.
 * @param target The target Widget to render into.
 * @returns A portal VNode.
 */
export function createPortal(node: VNode | VNode[], target: Widget): VNode {
    const children = Array.isArray(node) ? node : [node];
    return h(PortalComponent, { target }, ...children);
}
