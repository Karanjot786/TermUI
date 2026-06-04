import type { VNode } from './vnode.js';

export interface SuspenseProps {
    fallback: VNode;
    children?: VNode | VNode[];
}

export function Suspense({ children }: SuspenseProps): VNode | VNode[] | undefined {
    return children;
}