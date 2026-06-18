// ─────────────────────────────────────────────────────
// @termuijs/jsx — Virtual Node types
//
// A VNode is the lightweight description of what to
// render. Functional components return VNodes; the
// reconciler turns them into real Widgets.
// ─────────────────────────────────────────────────────

import type { Style, Color } from '@termuijs/core';
import type { Widget } from '@termuijs/widgets';

/** A functional component — takes props, returns a renderable node or widget */
export type FC<P = {}> = (props: P & { children?: VNode | VNode[] }) => VNode | Widget;

/** The basic building block of the component tree */
export type VNode =
    | VElement        // <Box>, <Text>, <Gauge>, etc.
    | VFragment       // <>...</>
    | string          // raw text
    | number          // coerced to string
    | boolean         // ignored (for {cond && <X/>} patterns)
    | null            // ignored
    | undefined;      // ignored

/** An element — either an intrinsic (string tag) or a component (function) */
export interface VElement {
    type: string | FC<any>;
    props: Record<string, any>;
    children: VNode[];
    key?: string | number;
}

/** A fragment — just a list of children, no wrapper */
export interface VFragment {
    type: typeof Fragment;
    children: VNode[];
}

/** Fragment sentinel */
export const Fragment = Symbol.for('termui.fragment');

/** Props that all intrinsic elements accept */
export interface IntrinsicProps {
    key?: string | number;
    children?: VNode | VNode[];
    // Style
    style?: string; // CSS class name from .tss
    // Common
    flexGrow?: number;
    flexShrink?: number;
    width?: number | string | any;  // any for now because we don't import Dim here to avoid circular dep or we can import from core
    height?: number | string | any;
    x?: number | any;
    y?: number | any;
    groupId?: string;
    constraints?: any[]; // any: constraint shapes vary per widget type; no shared interface
    padding?: number;
    margin?: number;
}

/** Check if a VNode is a VElement */
export function isVElement(node: VNode): node is VElement {
    return node != null && typeof node === 'object' && 'type' in node && 'props' in node;
}

/** Check if a VNode is a VFragment */
export function isVFragment(node: VNode): node is VFragment {
    return node != null && typeof node === 'object' && 'type' in node && (node as any).type === Fragment;
}

/** Flatten children — handles arrays, nulls, booleans */
export function flattenChildren(children: any[]): VNode[] { // any: VNode union includes primitives
    const result: VNode[] = [];
    for (const child of children) {
        if (child == null || typeof child === 'boolean') continue;
        if (Array.isArray(child)) {
            result.push(...flattenChildren(child));
        } else {
            result.push(child);
        }
    }
    return result;
}
