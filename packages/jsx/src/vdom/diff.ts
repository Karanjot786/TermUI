/**
 * Diffing algorithm with O(n) complexity
 * Uses key-based reconciliation similar to React
 */

import { VNode, Key } from './VNode';

export interface Patch {
  type: PatchType;
  node: VNode;
  index?: number;
  oldNode?: VNode;
  newChildren?: VNode[];
}

export enum PatchType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  MOVE = 'MOVE',
  REPLACE = 'REPLACE'
}

/**
 * Diff two VDOM trees and return patches
 */
export function diff(oldVNode: VNode | null, newVNode: VNode | null): Patch[] {
  const patches: Patch[] = [];

  if (oldVNode === null && newVNode !== null) {
    // Create new node
    patches.push({ type: PatchType.CREATE, node: newVNode });
    return patches;
  }

  if (oldVNode !== null && newVNode === null) {
    // Delete old node
    patches.push({ type: PatchType.DELETE, node: oldVNode });
    return patches;
  }

  if (oldVNode === null && newVNode === null) {
    return patches;
  }

  // Check if types are different
  if (oldVNode!.type !== newVNode!.type) {
    // Replace node
    patches.push({ type: PatchType.REPLACE, node: newVNode!, oldNode: oldVNode! });
    return patches;
  }

  // Update props if they changed
  if (propsChanged(oldVNode!.props, newVNode!.props)) {
    patches.push({ type: PatchType.UPDATE, node: newVNode! });
  }

  // Diff children recursively
  const childPatches = diffChildren(oldVNode!.children, newVNode!.children);
  patches.push(...childPatches);

  return patches;
}

/**
 * Diff children using key-based reconciliation
 */
function diffChildren(oldChildren: VNode[], newChildren: VNode[]): Patch[] {
  const patches: Patch[] = [];
  const oldKeys = new Map<Key, VNode>();
  const newKeys = new Map<Key, VNode>();
  const usedKeys = new Set<Key>();

  // Build key maps
  oldChildren.forEach(child => {
    if (child.key !== null) {
      oldKeys.set(child.key, child);
    }
  });

  newChildren.forEach(child => {
    if (child.key !== null) {
      newKeys.set(child.key, child);
    }
  });

  // Handle keyed children
  for (let i = 0; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    
    if (newChild.key !== null && oldKeys.has(newChild.key)) {
      // Key exists, update in place
      const oldChild = oldKeys.get(newChild.key)!;
      usedKeys.add(newChild.key);
      
      // Find old index
      const oldIndex = oldChildren.indexOf(oldChild);
      if (oldIndex !== i) {
        patches.push({
          type: PatchType.MOVE,
          node: newChild,
          index: i,
          oldNode: oldChild
        });
      }
      
      patches.push(...diff(oldChild, newChild));
    } else {
      // New key or keyless - create
      patches.push({ type: PatchType.CREATE, node: newChild, index: i });
    }
  }

  // Delete old children not in new tree
  for (const child of oldChildren) {
    if (child.key !== null && !usedKeys.has(child.key)) {
      patches.push({ type: PatchType.DELETE, node: child });
    }
  }

  return patches;
}

/**
 * Check if props have changed
 */
function propsChanged(oldProps: any, newProps: any): boolean {
  const oldKeys = Object.keys(oldProps);
  const newKeys = Object.keys(newProps);

  if (oldKeys.length !== newKeys.length) {
    return true;
  }

  for (const key of oldKeys) {
    if (oldProps[key] !== newProps[key]) {
      return true;
    }
  }

  return false;
}