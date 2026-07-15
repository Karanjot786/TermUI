/**
 * Virtual DOM Node representation
 * @package @termuijs/jsx
 */

export type VNodeType = string | Function | symbol;
export type Key = string | number | null;

export interface VNode {
  /** Type of the node (component, element, fragment) */
  type: VNodeType;
  /** Props passed to the node */
  props: Record<string, any>;
  /** Child nodes */
  children: VNode[];
  /** Unique key for list reconciliation */
  key: Key;
  /** Reference to the DOM node */
  dom: any;
  /** Component instance for class components */
  instance?: any;
  /** Flag for text nodes */
  isText?: boolean;
  /** Flag for fragment nodes */
  isFragment?: boolean;
  /** Parent VNode */
  parent?: VNode | null;
  /** Depth in the tree */
  depth?: number;
  /** Index in parent's children */
  index?: number;
}

export interface VNodeProps {
  key?: Key;
  children?: VNode | VNode[] | string | number;
  [key: string]: any;
}

/**
 * Create a VNode
 */
export function createVNode(
  type: VNodeType,
  props: VNodeProps = {},
  children?: VNode | VNode[] | string | number
): VNode {
  const normalizedChildren = normalizeChildren(children);
  const key = props.key ?? null;

  return {
    type,
    props: { ...props, key: undefined },
    children: normalizedChildren,
    key,
    dom: null,
    isText: typeof type === 'string' && type === '#text',
    isFragment: typeof type === 'symbol' && type === Fragment,
    parent: null,
    depth: 0,
    index: 0
  };
}

/**
 * Normalize children to array of VNodes
 */
function normalizeChildren(
  children?: VNode | VNode[] | string | number
): VNode[] {
  if (children === undefined || children === null) {
    return [];
  }

  if (Array.isArray(children)) {
    return children.flat().filter(Boolean) as VNode[];
  }

  if (typeof children === 'string' || typeof children === 'number') {
    return [createTextVNode(String(children))];
  }

  return [children];
}

/**
 * Create text VNode
 */
export function createTextVNode(text: string): VNode {
  return {
    type: '#text',
    props: { textContent: text },
    children: [],
    key: null,
    dom: null,
    isText: true,
    isFragment: false,
    parent: null,
    depth: 0,
    index: 0
  };
}

/**
 * Fragment symbol for multiple roots
 */
export const Fragment = Symbol('Fragment');