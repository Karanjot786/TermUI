import type { VNode } from './vnode.js';

export interface SuspenseProps {
    fallback: VNode;
    children?: VNode | VNode[];
}

/**
 * Suspense boundary — renders children normally during SSR/initial render.
 * When a child component throws a Promise (lazy loading), the reconciler
 * intercepts this component and renders `fallback` instead via SuspenseBoundary.
 * @see reconciler.ts SuspenseBoundary
 */
export function Suspense({ children }: SuspenseProps): VNode | VNode[] | undefined {
    return children;
}
