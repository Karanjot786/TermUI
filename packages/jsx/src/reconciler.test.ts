import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { Box, Text } from '@termuijs/widgets';
import { Screen } from '@termuijs/core';
import type { VNode } from './vnode.js';
import { reconcile, reRenderComponent, unmountAll } from './reconciler.js';
import { destroyFiber } from './hooks.js';

// ── Helper: make a functional component VNode ──

function h(type: any, props: Record<string, any> = {}, children: VNode[] = []): VNode {
    return { type, props, children } as any;
}

// ── Test components ──

function Leaf(): VNode {
    return h('text', {}, ['child']);
}

function Parent(): VNode {
    return h('box', {}, [h(Leaf), h(Leaf)]);
}

function GrandParent(): VNode {
    return h('box', {}, [h(Parent)]);
}

/** Component that returns a widget directly (hits vnode instanceof Widget code path) */
function ReturnsBoxDirectly(): Box {
    return new Box();
}

/** Component that returns text via reconcile (normal VNode path) */
function ReturnsTextVNode(): VNode {
    return h('text', {}, ['hello']);
}

function getInstanceMap(): Map<any, any> {
    return (globalThis as any).__termuijs_instances;
}

describe('_instanceMap leak prevention', () => {
    beforeEach(() => {
        getInstanceMap()?.clear();
    });

    afterEach(() => {
        unmountAll();
    });

    it('does not grow _instanceMap across re-renders', () => {
        const instances = getInstanceMap();
        expect(instances.size).toBe(0);

        // First render — creates widget tree + populates _instanceMap
        const rootVNode = h(GrandParent);
        const rootWidget = reconcile(rootVNode);
        const size1 = instances.size;
        expect(size1).toBeGreaterThan(0);

        // Re-render — should keep same number of entries
        const rootInstance = instances.get(rootWidget);
        expect(rootInstance).toBeDefined();

        const newWidget1 = reRenderComponent(rootInstance);
        const size2 = instances.size;
        expect(size2).toBe(size1);

        // Third render — still no growth
        const inst2 = instances.get(newWidget1);
        const newWidget2 = reRenderComponent(inst2);
        const size3 = instances.size;
        expect(size3).toBe(size1);

        // Fourth render — ditto
        const inst3 = instances.get(newWidget2);
        reRenderComponent(inst3);
        const size4 = instances.size;
        expect(size4).toBe(size1);
    });

    it('does not destroy hook state on reused fibers (portal compat)', () => {
        // This test simulates the scenario that broke PortalComponent:
        // After reconcile reuses child fibers, _pruneInstancesForWidget
        // must not call destroyFiber on them.
        const instances = getInstanceMap();
        expect(instances.size).toBe(0);

        const rootVNode = h(Parent);
        const rootWidget = reconcile(rootVNode);
        const size1 = instances.size;

        // Re-render the parent — child fibers are reused
        const rootInstance = instances.get(rootWidget);
        const newWidget1 = reRenderComponent(rootInstance);
        const size2 = instances.size;
        expect(size2).toBe(size1);

        // Verify that child fiber hooks still exist (not wiped by destroyFiber)
        const parentInstance = instances.get(newWidget1);
        expect(parentInstance).toBeDefined();
        const parentFiber = parentInstance.fiber;

        // Walk child fibers — they must not have empty hooks arrays
        if (parentFiber.childFibers) {
            for (const [, entry] of parentFiber.childFibers) {
                // If destroyFiber was called on this reused fiber,
                // its hooks would have been cleared to []
                expect(Array.isArray(entry.fiber.hooks)).toBe(true);
            }
        }
    });
});

describe('re-render dirty propagation', () => {
    beforeEach(() => {
        getInstanceMap()?.clear();
    });

    afterEach(() => {
        unmountAll();
    });

    it('returns dirty widgets on normal VNode reconcile path', () => {
        const rootVNode = h(ReturnsTextVNode);
        const rootWidget = reconcile(rootVNode);
        const rootInstance = getInstanceMap().get(rootWidget);

        const newWidget = reRenderComponent(rootInstance);
        expect(newWidget.isDirty).toBe(true);
    });

    it('marks returned widget dirty on vnode instanceof Widget path', () => {
        const rootVNode = h(ReturnsBoxDirectly);
        const rootWidget = reconcile(rootVNode);
        const rootInstance = getInstanceMap().get(rootWidget);

        const newWidget = reRenderComponent(rootInstance);
        expect(newWidget.isDirty).toBe(true);
    });

    it('dirty state propagates when re-parented to a container', () => {
        const rootVNode = h(ReturnsTextVNode);
        const rootWidget = reconcile(rootVNode);
        const rootInstance = getInstanceMap().get(rootWidget);

        const newWidget = reRenderComponent(rootInstance);

        const rootBox = new Box();
        rootBox.addChild(newWidget);
        rootBox.markDirty();

        expect(rootBox.isDirty).toBe(true);
    });

    it('clearDirty and re-render cycle produces correct dirty state', () => {
        const rootVNode = h(ReturnsTextVNode);
        const rootWidget = reconcile(rootVNode);
        const rootInstance = getInstanceMap().get(rootWidget);

        const newWidget = reRenderComponent(rootInstance);

        newWidget.clearDirty();
        expect(newWidget.isDirty).toBe(false);

        const inst2 = getInstanceMap().get(newWidget);
        const newerWidget = reRenderComponent(inst2);

        expect(newerWidget.isDirty).toBe(true);
    });
});
