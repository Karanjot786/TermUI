// ─────────────────────────────────────────────────────
// @termuijs/jsx — createPortal
// ─────────────────────────────────────────────────────

import type { Widget } from '@termuijs/widgets';
import type { VNode } from './vnode.js';
import { createElement as h } from './createElement.js';
import { useLayoutEffect } from './hooks.js';
import { reconcile } from './reconciler.js';

interface PortalProps {
    target: Widget;
    children: VNode[];
}

function PortalComponent({ target, children }: PortalProps): VNode {
    // We must call reconcile() inside the effect so we don't break the active Fiber stack 
    // during the render phase. When the layout effect runs, the Fiber context is correctly
    // restored, so Context and Hooks inside the portal children will work flawlessly!
    useLayoutEffect(() => {
        const childArray = Array.isArray(children) ? children : (children != null ? [children] : []);
        const childWidgets = childArray.map((child: VNode) => reconcile(child, target));

        for (const widget of childWidgets) {
            target.addChild(widget);
        }

        // Cleanup: remove ONLY this portal's widgets from the target
        // when the portal unmounts or re-renders.
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
