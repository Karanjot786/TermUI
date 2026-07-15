/**
 * Fiber Reconciler
 * Handles mounting, updating, and unmounting
 */

import { VNode, createVNode } from '../vdom/VNode';
import { diff, PatchType, Patch } from '../vdom/diff';
import { FiberNode, createFiberNode, EffectTag, FiberFlags } from '../fiber/FiberNode';
import { scheduler } from '../fiber/scheduler';
import { render } from '../render';

class FiberReconciler {
  private root: FiberNode | null = null;
  private currentRoot: FiberNode | null = null;
  private workInProgress: FiberNode | null = null;

  /**
   * Mount a VNode to the DOM
   */
  mount(vnode: VNode, container: any): void {
    // Create root fiber
    this.root = createFiberNode(vnode);
    this.currentRoot = this.root;
    
    // Schedule mount work
    scheduler.scheduleWork((deadline) => {
      this.mountFiber(this.root!, deadline);
      return false;
    }, FiberPriority.IMMEDIATE);
  }

  /**
   * Update the tree with new VNode
   */
  update(vnode: VNode): void {
    if (!this.currentRoot) {
      throw new Error('No root to update');
    }

    // Create work in progress tree
    this.workInProgress = this.cloneFiber(this.currentRoot);
    this.workInProgress.vnode = vnode;

    // Diff and schedule updates
    scheduler.scheduleWork((deadline) => {
      this.reconcile(this.currentRoot!, this.workInProgress!);
      return false;
    }, FiberPriority.HIGH);
  }

  /**
   * Mount a fiber tree
   */
  private mountFiber(fiber: FiberNode, deadline: IdleDeadline): void {
    if (!fiber.vnode) return;

    // Create DOM element
    const dom = render(fiber.vnode);
    fiber.dom = dom;

    // Mount children
    if (fiber.vnode.children) {
      let prevChild: FiberNode | null = null;
      for (let i = 0; i < fiber.vnode.children.length; i++) {
        const childVNode = fiber.vnode.children[i];
        const childFiber = createFiberNode(childVNode, fiber);
        childFiber.index = i;

        if (i === 0) {
          fiber.child = childFiber;
        } else if (prevChild) {
          prevChild.sibling = childFiber;
        }

        prevChild = childFiber;
        this.mountFiber(childFiber, deadline);
      }
    }
  }

  /**
   * Reconcile two fiber trees
   */
  private reconcile(current: FiberNode, workInProgress: FiberNode): void {
    // Diff virtual DOM
    const patches = diff(current.vnode, workInProgress.vnode);

    // Apply patches
    for (const patch of patches) {
      this.applyPatch(current, patch);
    }

    // Reconcile children
    let childA = current.child;
    let childB = workInProgress.child;

    while (childA && childB) {
      this.reconcile(childA, childB);
      childA = childA.sibling;
      childB = childB.sibling;
    }
  }

  /**
   * Apply a patch to the tree
   */
  private applyPatch(fiber: FiberNode, patch: Patch): void {
    switch (patch.type) {
      case PatchType.CREATE:
        this.createNode(patch.node, fiber);
        break;
      
      case PatchType.UPDATE:
        this.updateNode(patch.node, fiber);
        break;
      
      case PatchType.DELETE:
        this.deleteNode(patch.node);
        break;
      
      case PatchType.REPLACE:
        this.replaceNode(patch.oldNode!, patch.node, fiber);
        break;
      
      case PatchType.MOVE:
        this.moveNode(patch.oldNode!, patch.node, fiber);
        break;
    }
  }

  /**
   * Create a new node
   */
  private createNode(vnode: VNode, parent: FiberNode): void {
    const dom = render(vnode);
    const fiber = createFiberNode(vnode, parent);
    fiber.dom = dom;
    fiber.flags |= FiberFlags.CREATE;
    
    // Append to parent
    if (parent.dom) {
      parent.dom.appendChild(dom);
    }
  }

  /**
   * Update an existing node
   */
  private updateNode(vnode: VNode, parent: FiberNode): void {
    // Find existing fiber
    let child = parent.child;
    while (child) {
      if (child.vnode?.key === vnode.key) {
        // Update props
        if (child.vnode) {
          child.vnode.props = vnode.props;
        }
        child.flags |= FiberFlags.UPDATE;
        break;
      }
      child = child.sibling;
    }
  }

  /**
   * Delete a node
   */
  private deleteNode(vnode: VNode): void {
    // Find and remove from DOM
    // Implementation depends on DOM structure
    if (vnode.dom) {
      vnode.dom.remove();
    }
  }

  /**
   * Replace a node
   */
  private replaceNode(oldVNode: VNode, newVNode: VNode, parent: FiberNode): void {
    const newDom = render(newVNode);
    
    if (oldVNode.dom && parent.dom) {
      parent.dom.replaceChild(newDom, oldVNode.dom);
    }
  }

  /**
   * Move a node
   */
  private moveNode(oldVNode: VNode, newVNode: VNode, parent: FiberNode): void {
    // Remove from old position, insert at new position
    // Implementation depends on DOM structure
  }

  /**
   * Clone a fiber tree
   */
  private cloneFiber(fiber: FiberNode): FiberNode {
    const clone = createFiberNode(fiber.vnode, fiber.parent);
    clone.dom = fiber.dom;
    clone.flags = fiber.flags;
    clone.effectTag = fiber.effectTag;
    clone.memoizedState = fiber.memoizedState;
    clone.memoizedProps = fiber.memoizedProps;

    // Clone children
    if (fiber.child) {
      clone.child = this.cloneFiber(fiber.child);
    }

    return clone;
  }
}

export const reconciler = new FiberReconciler();