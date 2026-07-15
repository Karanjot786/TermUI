/**
 * Fiber Node implementation for incremental rendering
 * Based on React Fiber architecture
 */

import { VNode } from '../vdom/VNode';

export enum FiberPriority {
  IMMEDIATE = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  IDLE = 5
}

export interface FiberNode {
  /** Type of fiber */
  type: any;
  /** Virtual DOM node reference */
  vnode: VNode | null;
  /** DOM node reference */
  dom: any;
  /** Parent fiber */
  parent: FiberNode | null;
  /** Child fiber */
  child: FiberNode | null;
  /** Sibling fiber */
  sibling: FiberNode | null;
  /** Work in progress alternative */
  alternate: FiberNode | null;
  /** Effect list for commits */
  effectTag?: EffectTag;
  /** Priority of this fiber */
  priority: FiberPriority;
  /** State for hooks */
  memoizedState: any;
  /** Props for this fiber */
  memoizedProps: any;
  /** Pending work */
  pendingProps: any;
  /** Flags for side effects */
  flags: FiberFlags;
  /** Index in parent's children */
  index: number;
  /** Key for reconciliation */
  key: string | number | null;
}

export enum EffectTag {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  PLACEMENT = 'PLACEMENT',
  UPDATE_PROPS = 'UPDATE_PROPS',
  UPDATE_STATE = 'UPDATE_STATE'
}

export enum FiberFlags {
  NONE = 0,
  UPDATE = 1 << 0,
  DELETE = 1 << 1,
  CREATE = 1 << 2,
  PLACEMENT = 1 << 3,
  PROP_UPDATE = 1 << 4
}

/**
 * Create a new Fiber node
 */
export function createFiberNode(
  vnode: VNode | null,
  parent: FiberNode | null = null
): FiberNode {
  return {
    type: vnode?.type ?? null,
    vnode,
    dom: null,
    parent,
    child: null,
    sibling: null,
    alternate: null,
    effectTag: undefined,
    priority: FiberPriority.NORMAL,
    memoizedState: null,
    memoizedProps: vnode?.props ?? {},
    pendingProps: vnode?.props ?? {},
    flags: FiberFlags.NONE,
    index: 0,
    key: vnode?.key ?? null
  };
}